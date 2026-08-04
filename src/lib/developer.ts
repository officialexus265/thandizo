import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "./prisma";

export function generateAccessCode(): string {
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

/**
 * All successful donations go DIRECT (available after platform fee).
 * available = sum(netAmount) - withdrawn - pending withdrawals
 */
export async function projectMoneySummary(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { status: true },
  });

  const donations = await prisma.donation.findMany({
    where: { projectId, status: "SUCCESS" },
    select: {
      amount: true,
      netAmount: true,
      platformFeeAmount: true,
      currency: true,
    },
  });

  const withdrawals = await prisma.withdrawal.findMany({
    where: {
      projectId,
      status: { in: ["SUCCESS", "PROCESSING", "PENDING"] },
    },
    select: { amount: true, status: true },
  });

  let collected = 0;
  let fees = 0;
  let netCollected = 0;
  let currency = "MWK";

  for (const d of donations) {
    const gross = Number(d.amount);
    const net = Number(d.netAmount) || gross;
    const fee = Number(d.platformFeeAmount) || 0;
    currency = d.currency || currency;
    collected += gross;
    fees += fee;
    netCollected += net;
  }

  let withdrawn = 0;
  let pendingWithdraw = 0;
  for (const w of withdrawals) {
    const n = Number(w.amount);
    if (w.status === "SUCCESS") withdrawn += n;
    else pendingWithdraw += n;
  }

  const available = Math.max(
    0,
    Math.round((netCollected - withdrawn - pendingWithdraw) * 100) / 100
  );

  return {
    collected,
    fees,
    netCollected,
    held: 0,
    heldReleased: true,
    available,
    withdrawn,
    pendingWithdraw,
    currency,
    donationCount: donations.length,
    projectStatus: project?.status || null,
  };
}
