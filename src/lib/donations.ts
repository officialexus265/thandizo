import { prisma } from "./prisma";

const PENDING_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Flip any donation still stuck on PENDING after PENDING_EXPIRY_MS to CANCELLED.
 * Safe to call frequently — cheap no-op when nothing is stale.
 */
export async function expireStalePendingDonations() {
  await prisma.donation.updateMany({
    where: {
      status: "PENDING",
      createdAt: { lt: new Date(Date.now() - PENDING_EXPIRY_MS) },
    },
    data: { status: "CANCELLED" },
  });
}
