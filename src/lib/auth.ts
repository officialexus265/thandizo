import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { verifyAccessCode } from "./developer";

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email },
        });

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
        accessCode: { label: "Access code", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.accessCode) return null;
        const email = credentials.email.trim().toLowerCase();
        const developer = await prisma.developer.findUnique({ where: { email } });
        if (!developer) return null;
        const ok = await verifyAccessCode(credentials.accessCode, developer.accessCodeHash);
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
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
