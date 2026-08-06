import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { verifyAccessCode } from "./developer";
import {
  checkRateLimit,
  recordRateLimitHit,
  hitRateLimit,
  delayMs,
} from "./rate-limit";

const ADMIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const ADMIN_MAX_FAILS_IP = 5;
const ADMIN_MAX_FAILS_EMAIL = 8;

function clientIpFromReq(req: any): string {
  try {
    const h = req?.headers;
    if (!h) return "unknown";
    if (typeof h.get === "function") {
      const xf = h.get("x-forwarded-for");
      if (xf) return String(xf).split(",")[0].trim();
      return h.get("x-real-ip") || h.get("cf-connecting-ip") || "unknown";
    }
    const xf = h["x-forwarded-for"];
    if (xf) return String(xf).split(",")[0].trim();
    return String(h["x-real-ip"] || h["cf-connecting-ip"] || "unknown");
  } catch {
    return "unknown";
  }
}

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

        const ip = clientIpFromReq(req);
        const emailKey = credentials.email.trim().toLowerCase();
        const ipKey = `admin-fail-ip:${ip}`;
        const emailFailKey = `admin-fail-email:${emailKey}`;

        // Block if already over limit (failed attempts only)
        const ipBlocked = checkRateLimit(ipKey, ADMIN_MAX_FAILS_IP);
        if (!ipBlocked.ok) {
          await delayMs(800);
          throw new Error("TOO_MANY_ATTEMPTS");
        }
        const emailBlocked = checkRateLimit(emailFailKey, ADMIN_MAX_FAILS_EMAIL);
        if (!emailBlocked.ok) {
          await delayMs(800);
          throw new Error("TOO_MANY_ATTEMPTS");
        }

        const admin = await prisma.admin.findUnique({
          where: { email: emailKey },
        });

        const fail = async () => {
          recordRateLimitHit(ipKey, ADMIN_WINDOW_MS);
          recordRateLimitHit(emailFailKey, ADMIN_WINDOW_MS);
          // Slow down brute force
          await delayMs(600 + Math.floor(Math.random() * 400));
          return null;
        };

        if (!admin) {
          return fail();
        }

        const valid = await bcrypt.compare(credentials.password, admin.passwordHash);
        if (!valid) {
          return fail();
        }

        if (admin.twoFactorEnabled) {
          if (!credentials.token || !admin.twoFactorSecret) {
            // Don't count as full failure for missing 2FA step mid-flow
            throw new Error("2FA_REQUIRED");
          }
          const isValidToken = authenticator.verify({
            token: credentials.token,
            secret: admin.twoFactorSecret,
          });
          if (!isValidToken) {
            recordRateLimitHit(ipKey, ADMIN_WINDOW_MS);
            recordRateLimitHit(emailFailKey, ADMIN_WINDOW_MS);
            await delayMs(500);
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

        const ip = clientIpFromReq(req);
        const limited = hitRateLimit(`dev-login:${ip}`, 20, 15 * 60 * 1000);
        if (!limited.ok) throw new Error("TOO_MANY_ATTEMPTS");

        const developer = await prisma.developer.findUnique({ where: { email } });
        if (!developer || developer.bannedAt) {
          await delayMs(400);
          return null;
        }

        let ok = false;
        if (password && developer.passwordHash) {
          ok = await bcrypt.compare(password, developer.passwordHash);
        }
        if (!ok && accessCode) {
          ok = await verifyAccessCode(accessCode, developer.accessCodeHash);
        }
        if (!ok) {
          await delayMs(400);
          return null;
        }

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
    maxAge: 8 * 60 * 60,
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
