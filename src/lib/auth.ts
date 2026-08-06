import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { verifyAccessCode } from "./developer";
import { hitRateLimit } from "./rate-limit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "admin-credentials",
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "2FA Token", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // IP rate limit — stop credential stuffing on /admin/login
        const ip =
          (req as any)?.headers?.["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
          (req as any)?.headers?.["x-real-ip"]?.toString() ||
          "unknown";
        const limited = hitRateLimit(`admin-login:${ip}`, 8, 15 * 60 * 1000);
        if (!limited.ok) {
          throw new Error("TOO_MANY_ATTEMPTS");
        }
        // Also limit per email
        const emailKey = credentials.email.trim().toLowerCase();
        const emailLimited = hitRateLimit(`admin-login-email:${emailKey}`, 10, 15 * 60 * 1000);
        if (!emailLimited.ok) {
          throw new Error("TOO_MANY_ATTEMPTS");
        }

        const admin = await prisma.admin.findUnique({
          where: { email: emailKey },
        });

        // Constant-ish failure: always same outcome message upstream
        if (!admin) return null;

        const valid = await bcrypt.compare(credentials.password, admin.passwordHash);
        if (!valid) return null;

        if (admin.twoFactorEnabled) {
          if (!credentials.token || !admin.twoFactorSecret) {
            throw new Error("2FA_REQUIRED");
          }
          const isValidToken = authenticator.verify({
            token: credentials.token,
            secret: admin.twoFactorSecret,
          });
          if (!isValidToken) {
            throw new Error("INVALID_2FA");
          }
        }

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name || "Admin",
          role: "admin",
        } as any;
      },
    }),
    CredentialsProvider({
      id: "developer-credentials",
      name: "Developer",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        accessCode: { label: "Access code", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email) return null;
        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password?.trim() || "";
        const accessCode = credentials.accessCode?.trim() || "";
        if (!password && !accessCode) return null;

        const ip =
          (req as any)?.headers?.["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
          "unknown";
        const limited = hitRateLimit(`dev-login:${ip}`, 20, 15 * 60 * 1000);
        if (!limited.ok) throw new Error("TOO_MANY_ATTEMPTS");

        const developer = await prisma.developer.findUnique({ where: { email } });
        if (!developer || developer.bannedAt) return null;

        let ok = false;
        // Prefer password when both sent; accept either
        if (password && developer.passwordHash) {
          ok = await bcrypt.compare(password, developer.passwordHash);
        }
        if (!ok && accessCode) {
          ok = await verifyAccessCode(accessCode, developer.accessCodeHash);
        }
        if (!ok) return null;

        return {
          id: developer.id,
          email: developer.email,
          name: developer.name,
          role: "developer",
        } as any;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
