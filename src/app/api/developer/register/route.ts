import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDeveloperWithCode } from "@/lib/developer";
import { sendEmail, sendSMS, normalizePhone } from "@/lib/notifications";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const securityQuestion = String(body.securityQuestion || "").trim();
    const securityAnswer = String(body.securityAnswer || "").trim();

    if (!name || !email || !phone || !password || !securityQuestion || !securityAnswer) {
      return NextResponse.json(
        { error: "Name, email, phone, password, and security question/answer required" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password min 8 characters" }, { status: 400 });
    }

    const existing = await prisma.developer.findUnique({ where: { email } });
    if (existing && !existing.bannedAt) {
      return NextResponse.json(
        { error: "An active account with this email already exists. Sign in instead." },
        { status: 400 }
      );
    }

    // Banned accounts may re-register: create new row only if email free, else update banned shell
    let developerId: string;
    let accessCode: string;

    if (existing?.bannedAt) {
      // Allow new account with same email by renaming old email
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
    developerId = created.developerId;
    accessCode = created.accessCode;

    await prisma.developer.update({
      where: { id: developerId },
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
        `Sign in at /developer/login with your email and access code:\n${accessCode}\n\n` +
        `Next steps:\n` +
        `1. Verify email and phone (Security)\n` +
        `2. Complete KYC (required before any campaign)\n` +
        `3. Submit or manage projects after KYC approval\n\n` +
        `Inu ndi thandizo lathu`
    );
    await sendSMS(
      phone,
      `Thandizo: account created. Access code ${accessCode}. Verify email/phone then complete KYC.`
    );

    return NextResponse.json({
      success: true,
      accessCode,
      message: "Account created. Check email/SMS for access code. Complete verification + KYC next.",
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}
