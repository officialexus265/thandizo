import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDeveloperWithCode } from "@/lib/developer";
import { sendEmail, sendSMS, normalizePhone } from "@/lib/notifications";
import bcrypt from "bcryptjs";
import { hitRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const securityQuestion = String(body.securityQuestion || "").trim();
    const securityAnswer = String(body.securityAnswer || "").trim();

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const byIp = hitRateLimit(`register:ip:${ip}`, 8, 60 * 60 * 1000);
    if (!byIp.ok) {
      return NextResponse.json(
        { error: "Too many sign-up attempts. Try again later.", retryAfterSeconds: byIp.retryAfterSeconds },
        { status: 429 }
      );
    }
    if (email) {
      const byEmail = hitRateLimit(`register:email:${email}`, 3, 60 * 60 * 1000);
      if (!byEmail.ok) {
        return NextResponse.json(
          { error: "Too many attempts for this email. Try again later.", retryAfterSeconds: byEmail.retryAfterSeconds },
          { status: 429 }
        );
      }
    }

    if (!name || !email || !phone || !password || !securityQuestion || !securityAnswer) {
      return NextResponse.json(
        { error: "Name, email, phone, password, and security question/answer required" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password min 8 characters" }, { status: 400 });
    }
    if (securityQuestion.length < 5 || securityAnswer.length < 2) {
      return NextResponse.json(
        { error: "Use a clearer security question and answer" },
        { status: 400 }
      );
    }

    const existing = await prisma.developer.findUnique({ where: { email } });
    if (existing && !existing.bannedAt) {
      return NextResponse.json(
        { error: "An active account with this email already exists. Sign in instead." },
        { status: 400 }
      );
    }

    if (existing?.bannedAt) {
      await prisma.developer.update({
        where: { id: existing.id },
        data: { email: `banned+${existing.id}@thandizo.invalid` },
      });
    }

    const created = await ensureDeveloperWithCode({
      name,
      email,
      phone: normalizePhone(phone),
    });

    await prisma.developer.update({
      where: { id: created.developerId },
      data: {
        phone: normalizePhone(phone),
        passwordHash: await bcrypt.hash(password, 10),
        securityQuestion,
        securityAnswerHash: await bcrypt.hash(securityAnswer.toLowerCase(), 10),
      },
    });

    await sendEmail(
      email,
      "Welcome to Thandizo — fundraiser account",
      `Hello ${name},\n\n` +
        `Your fundraiser account was created.\n\n` +
        `Sign in at /developer/login with your email and access code:\n${created.accessCode}\n\n` +
        `Next steps:\n` +
        `1. Verify email and phone (Security)\n` +
        `2. Complete KYC (required before any campaign)\n` +
        `3. After KYC approval, submit your project\n` +
        `4. When funded, withdraw with SMS OTP\n\n` +
        `Inu ndi thandizo lathu`
    );
    await sendSMS(
      phone,
      `Thandizo: account created. Access code ${created.accessCode}. Verify email/phone then complete KYC.`
    );

    return NextResponse.json({
      success: true,
      accessCode: created.accessCode,
      message: "Account created. Check email/SMS for access code.",
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}
