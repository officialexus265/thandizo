import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "./prisma";
import { sendEmail, sendSMS, normalizePhone } from "./notifications";

/** Minimum seconds between OTP sends for same target+purpose */
export const OTP_COOLDOWN_SECONDS = 60;
/** Max OTPs per target+purpose in this window */
export const OTP_MAX_PER_HOUR = 5;

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

export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function assertOtpRateLimit(target: string, purpose: string) {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);

  const recent = await prisma.verificationCode.findMany({
    where: {
      target,
      purpose,
      createdAt: { gte: oneHourAgo },
    },
    orderBy: { createdAt: "desc" },
    take: OTP_MAX_PER_HOUR + 1,
  });

  if (recent.length >= OTP_MAX_PER_HOUR) {
    const oldest = recent[recent.length - 1];
    const unlockAt = oldest.createdAt.getTime() + 60 * 60 * 1000;
    const retryAfterSeconds = Math.max(1, Math.ceil((unlockAt - now) / 1000));
    throw new RateLimitError(
      `Too many codes requested. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      retryAfterSeconds
    );
  }

  if (recent[0]) {
    const elapsed = (now - recent[0].createdAt.getTime()) / 1000;
    if (elapsed < OTP_COOLDOWN_SECONDS) {
      const retryAfterSeconds = Math.ceil(OTP_COOLDOWN_SECONDS - elapsed);
      throw new RateLimitError(
        `Please wait ${retryAfterSeconds}s before requesting another code.`,
        retryAfterSeconds
      );
    }
  }
}

/** Create + send OTP; rate-limited; invalidates previous unused codes */
export async function issueVerificationCode(params: {
  developerId?: string | null;
  channel: "EMAIL" | "SMS";
  purpose: "SIGNUP_EMAIL" | "SIGNUP_PHONE" | "WITHDRAW" | "RESET";
  target: string;
  messagePrefix?: string;
}) {
  const target =
    params.channel === "SMS" ? normalizePhone(params.target) : params.target.trim().toLowerCase();

  await assertOtpRateLimit(target, params.purpose);

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

  return {
    ok: true,
    expiresAt,
    cooldownSeconds: OTP_COOLDOWN_SECONDS,
  };
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
