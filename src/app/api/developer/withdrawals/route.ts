import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectMoneySummary } from "@/lib/developer";
import { requestWithdrawal } from "@/lib/withdrawals";
import { issueVerificationCode, consumeVerificationCode, RateLimitError } from "@/lib/otp";
import { verifyCaptcha, getClientIp } from "@/lib/captcha";
import { limitByIp } from "@/lib/rate-limit";
import { getWithdrawalFeeSettings } from "@/lib/withdrawals";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;
  const projectId = req.nextUrl.searchParams.get("projectId");

  const where: any = { developerId };
  if (projectId) where.projectId = projectId;

  const list = await prisma.withdrawal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { project: { select: { title: true, slug: true } } },
  });

  let money = null;
  if (projectId) {
    const owned = await prisma.project.findFirst({
      where: { id: projectId, developerId },
    });
    if (owned) money = await projectMoneySummary(projectId);
  }

  const developer = await prisma.developer.findUnique({
    where: { id: developerId },
    select: {
      payoutPhone: true,
      phone: true,
      kycStatus: true,
      emailVerifiedAt: true,
      phoneVerifiedAt: true,
    },
  });

  const feeSettings = await getWithdrawalFeeSettings();
  return NextResponse.json({ withdrawals: list, money, developer, feeSettings });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;

  try {
    const body = await req.json();
    const action = String(body.action || "withdraw");

    const developer = await prisma.developer.findUnique({ where: { id: developerId } });
    if (!developer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (developer.kycStatus !== "APPROVED") {
      return NextResponse.json({ error: "KYC must be approved before withdrawing" }, { status: 400 });
    }
    if (!developer.emailVerifiedAt || !developer.phoneVerifiedAt) {
      return NextResponse.json(
        { error: "Verify email and phone before withdrawing" },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);
    const ipLimit = limitByIp(ip, "withdraw", 20, 60 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: "Too many withdrawal attempts from this network.", retryAfterSeconds: ipLimit.retryAfterSeconds },
        { status: 429 }
      );
    }

    if (action === "send-otp") {
      const captcha = await verifyCaptcha(body.captchaToken, ip);
      if (!captcha.ok) {
        return NextResponse.json({ error: captcha.error }, { status: 400 });
      }
      const phone = String(body.phone || developer.payoutPhone || developer.phone || "");
      if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });
      const issued = await issueVerificationCode({
        developerId,
        channel: "SMS",
        purpose: "WITHDRAW",
        target: phone,
        messagePrefix: "Your Thandizo withdrawal confirmation code is",
      });
      return NextResponse.json({ success: true, sent: true, cooldownSeconds: issued.cooldownSeconds });
    }

    if (action === "withdraw") {
      const projectId = String(body.projectId || "");
      const amount = Number(body.amount);
      const phone = String(body.phone || "").trim();
      const otp = String(body.otp || "").trim();

      if (!projectId || !amount || !phone || !otp) {
        return NextResponse.json(
          { error: "projectId, amount, phone, and OTP required" },
          { status: 400 }
        );
      }

      const ok = await consumeVerificationCode({
        purpose: "WITHDRAW",
        target: phone,
        code: otp,
        developerId,
      });
      if (!ok) {
        return NextResponse.json({ error: "Invalid or expired withdrawal OTP" }, { status: 400 });
      }

      const captcha = await verifyCaptcha(body.captchaToken, ip);
      if (!captcha.ok) {
        return NextResponse.json({ error: captcha.error }, { status: 400 });
      }
      const result = await requestWithdrawal({
        projectId,
        developerId,
        amount,
        phone,
        ipAddress: ip,
      });

      return NextResponse.json({ success: true, withdrawal: result.withdrawal });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    if (err instanceof RateLimitError || err?.name === "RateLimitError") {
      return NextResponse.json(
        { error: err.message, retryAfterSeconds: err.retryAfterSeconds },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: err.message || "Withdrawal failed" }, { status: 400 });
  }
}
