import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "./prisma";

export function generateAccessCode(): string {
  // 10-char readable code (no ambiguous chars)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  let out = "";
  for (let i = 0; i < 10; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export async function hashAccessCode(code: string) {
  return bcrypt.hash(code.trim().toUpperCase(), 10);
}

export async function verifyAccessCode(code: string, hash: string) {
  return bcrypt.compare(code.trim().toUpperCase(), hash);
}

/** Create or update developer and return plaintext code once */
export async function ensureDeveloperWithCode(params: {
  name: string;
  email: string;
  phone?: string | null;
}) {
  const email = params.email.trim().toLowerCase();
  const code = generateAccessCode();
  const accessCodeHash = await hashAccessCode(code);

  const existing = await prisma.developer.findUnique({ where: { email } });
  if (existing) {
    await prisma.developer.update({
      where: { id: existing.id },
      data: {
        name: params.name,
        phone: params.phone || existing.phone,
        accessCodeHash,
      },
    });
    return { developerId: existing.id, accessCode: code, isNew: false };
  }

  const d = await prisma.developer.create({
    data: {
      name: params.name,
      email,
      phone: params.phone || null,
      accessCodeHash,
    },
  });
  return { developerId: d.id, accessCode: code, isNew: true };
}

export async function projectMoneySummary(projectId: string) {
  const donations = await prisma.donation.findMany({
    where: { projectId, status: "SUCCESS" },
    select: { amount: true, fundMode: true, currency: true },
  });

  let collected = 0;
  let held = 0;
  let available = 0; // DIRECT = released to project / withdrawable under your rules
  let currency = "MWK";

  for (const d of donations) {
    const n = Number(d.amount);
    currency = d.currency || currency;
    collected += n;
    if (d.fundMode === "HOLD") held += n;
    else available += n;
  }

  return {
    collected,
    held,
    available,
    currency,
    donationCount: donations.length,
  };
}
