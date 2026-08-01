/**
 * Reconcile one or more donations by re-verifying them against PayChangu.
 * Use this for donations that succeeded on PayChangu but were marked
 * FAILED/PENDING locally (e.g. due to the verify-endpoint bug).
 *
 * Usage:
 *   npx tsx scripts/reconcile-donation.ts mth-2e00151f-msam57mn mth-182f6ff9-msam3c6j
 */
import { PrismaClient } from "@prisma/client";
import { verifyPayChanguTransaction } from "../src/lib/paychangu";

const prisma = new PrismaClient();

async function reconcile(txRef: string) {
  const donation = await prisma.donation.findUnique({ where: { txRef } });

  if (!donation) {
    console.log(`[${txRef}] not found, skipping`);
    return;
  }

  if (donation.status === "SUCCESS") {
    console.log(`[${txRef}] already SUCCESS, skipping`);
    return;
  }

  const verification = await verifyPayChanguTransaction(txRef);
  const isSuccess =
    verification?.status === "success" ||
    verification?.status === "successful" ||
    verification?.data?.status === "success" ||
    verification?.data?.status === "successful";

  if (!isSuccess) {
    console.log(`[${txRef}] PayChangu still reports non-success, leaving as-is`);
    console.log(JSON.stringify(verification));
    return;
  }

  await prisma.$transaction([
    prisma.donation.update({
      where: { id: donation.id },
      data: {
        status: "SUCCESS",
        paychanguRef:
          verification?.data?.id || verification?.data?.transaction_id || null,
      },
    }),
    prisma.project.update({
      where: { id: donation.projectId },
      data: {
        raisedAmount: { increment: donation.amount },
        donorCount: { increment: 1 },
      },
    }),
  ]);

  console.log(`[${txRef}] confirmed SUCCESS, project totals updated`);
}

async function main() {
  const txRefs = process.argv.slice(2);
  if (txRefs.length === 0) {
    console.error("Pass one or more tx_refs as arguments");
    process.exit(1);
  }

  for (const txRef of txRefs) {
    await reconcile(txRef);
  }

  await prisma.$disconnect();
}

main();
