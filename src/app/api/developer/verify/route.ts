import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueVerificationCode, consumeVerificationCode } from "@/lib/otp";
import { normalizePhone } from "@/lib/notifications";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = (session.user as any).id as string;
  const d = await prisma.developer.findUnique({ where: { id } });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    email: d.email,
    phone: d.phone,
    emailVerified: !!d.emailVerifiedAt,
    phoneVerified: !!d.phoneVerifiedAt,
    kycStatus: d.kycStatus,
    hasSecurityQuestion: !!d.securityQuestion,
    hasPassword: !!d.passwordHash,
    createdAt: d.createdAt,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;
  const body = await req.json();
  const action = String(body.action || "");

  const d = await prisma.developer.findUnique({ where: { id: developerId } });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    if (action === "send-email") {
      await issueVerificationCode({
        developerId,
        channel: "EMAIL",
        purpose: "SIGNUP_EMAIL",
        target: d.email,
        messagePrefix: "Your Thandizo email verification code is",
      });
      return NextResponse.json({ success: true, sent: "email" });
    }

    if (action === "confirm-email") {
      const code = String(body.code || "");
      const ok = await consumeVerificationCode({
        purpose: "SIGNUP_EMAIL",
        target: d.email,
        code,
        developerId,
      });
      if (!ok) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
      await prisma.developer.update({
        where: { id: developerId },
        data: { emailVerifiedAt: new Date() },
      });
      return NextResponse.json({ success: true, emailVerified: true });
    }

    if (action === "send-phone") {
      const phone = String(body.phone || d.phone || "").trim();
      if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });
      await prisma.developer.update({
        where: { id: developerId },
        data: { phone: normalizePhone(phone) },
      });
      await issueVerificationCode({
        developerId,
        channel: "SMS",
        purpose: "SIGNUP_PHONE",
        target: phone,
        messagePrefix: "Your Thandizo phone verification code is",
      });
      return NextResponse.json({ success: true, sent: "sms" });
    }

    if (action === "confirm-phone") {
      const code = String(body.code || "");
      const phone = String(body.phone || d.phone || "");
      const ok = await consumeVerificationCode({
        purpose: "SIGNUP_PHONE",
        target: phone,
        code,
        developerId,
      });
      if (!ok) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
      await prisma.developer.update({
        where: { id: developerId },
        data: {
          phoneVerifiedAt: new Date(),
          phone: normalizePhone(phone),
        },
      });
      return NextResponse.json({ success: true, phoneVerified: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
