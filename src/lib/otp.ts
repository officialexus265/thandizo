import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "./prisma";
import { sendEmail, sendSMS, normalizePhone } from "./notifications";

export function generateOtp(length = 6): string {
  let s = "";
  for (let i = 0; i < length; i++) s += String(randomInt(0, 10));
  return s;
}

export async function hashOtp(code: string) {
  return bcrypt.hash(code, 10);
}

export async function verifyOtpHash(code: string, hash: string) {
  return bcrypt.compare(code, hash);
}

/** Create + send OTP; invalidates previous unused codes for same target+purpose */
export async function issueVerificationCode(params: {
  developerId?: string | null;
  channel: "EMAIL" | "SMS";
  purpose: "SIGNUP_EMAIL" | "SIGNUP_PHONE" | "WITHDRAW" | "RESET";
  target: string;
  messagePrefix?: string;
}) {
  const target =
    params.channel === "SMS" ? normalizePhone(params.target) : params.target.trim().toLowerCase();

  await prisma.verificationCode.updateMany({
    where: {
      target,
      purpose: params.purpose,
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  const code = generateOtp(6);
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.verificationCode.create({
    data: {
      developerId: params.developerId || null,
      channel: params.channel,
      purpose: params.purpose,
      target,
      codeHash,
      expiresAt,
    },
  });

  const text =
    (params.messagePrefix || "Your Thandizo code is") +
    ` ${code}. Valid for 15 minutes. Do not share this code.`;

  if (params.channel === "EMAIL") {
    await sendEmail(target, "Thandizo verification code", text);
  } else {
    await sendSMS(target, text);
  }

  return { ok: true, expiresAt };
}

export async function consumeVerificationCode(params: {
  purpose: string;
  target: string;
  code: string;
  developerId?: string | null;
}) {
  const target = params.target.includes("@")
    ? params.target.trim().toLowerCase()
    : normalizePhone(params.target);

  const rows = await prisma.verificationCode.findMany({
    where: {
      purpose: params.purpose,
      target,
      usedAt: null,
      expiresAt: { gt: new Date() },
      ...(params.developerId ? { developerId: params.developerId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  for (const row of rows) {
    const ok = await verifyOtpHash(params.code.trim(), row.codeHash);
    if (ok) {
      await prisma.verificationCode.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
      return true;
    }
  }
  return false;
}
