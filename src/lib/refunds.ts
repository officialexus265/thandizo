import { prisma } from "./prisma";
import { detectMalawiOperator, initiateMobileMoneyPayout } from "./paychangu";
import { sendEmail, sendSMS } from "./notifications";
import { v4 as uuidv4 } from "uuid";

export type AggregatedDonor = {
  key: string;
  donorName: string | null;
  email: string | null;
  phone: string | null;
  preferredContact: "NONE" | "EMAIL" | "SMS" | "BOTH";
  currency: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  donationIds: string[];
  canAutoPayout: boolean;
  operatorRefId: string | null;
  normalizedPhone: string | null;
  skipReason?: string;
};

/** Group SUCCESS + HOLD donations for an open project, per person */
async function getFeeRate(): Promise<number> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  const pct = settings?.refundFeePercent ?? 10;
  const rate = Number(pct) / 100;
  if (isNaN(rate) || rate < 0) return 0.1;
  if (rate > 0.5) return 0.5; // safety cap 50%
  return rate;
}

export async function previewRefund(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");
  if (project.status === "CLOSED" || project.status === "FUNDED") {
    throw new Error("Refunds are not allowed after a project is finished or closed");
  }
  const FEE_RATE = await getFeeRate();

  const donations = await prisma.donation.findMany({
    where: {
      projectId,
      status: "SUCCESS",
      fundMode: "HOLD",
      refundItemId: null,
    },
    orderBy: { createdAt: "asc" },
  });

  const map = new Map<string, AggregatedDonor>();

  for (const d of donations) {
    const phoneKey = d.phone?.replace(/\D/g, "") || "";
    const emailKey = (d.email || "").toLowerCase().trim();
    const key = phoneKey
      ? `p:${phoneKey}`
      : emailKey
      ? `e:${emailKey}`
      : `id:${d.id}`;

    const amount = Number(d.amount);
    const existing = map.get(key);
    if (existing) {
      existing.grossAmount += amount;
      existing.donationIds.push(d.id);
      if (!existing.phone && d.phone) existing.phone = d.phone;
      if (!existing.email && d.email) existing.email = d.email;
      if (!existing.donorName && d.donorName) existing.donorName = d.donorName;
    } else {
      map.set(key, {
        key,
        donorName: d.donorName,
        email: d.email,
        phone: d.phone,
        preferredContact: d.preferredContact as any,
        currency: d.currency,
        grossAmount: amount,
        feeAmount: 0,
        netAmount: 0,
        donationIds: [d.id],
        canAutoPayout: false,
        operatorRefId: null,
        normalizedPhone: null,
      });
    }
  }

  const donors: AggregatedDonor[] = [];
  for (const d of map.values()) {
    d.feeAmount = Math.round(d.grossAmount * FEE_RATE * 100) / 100;
    d.netAmount = Math.round((d.grossAmount - d.feeAmount) * 100) / 100;

    if (d.currency !== "MWK") {
      d.canAutoPayout = false;
      d.skipReason = "Only MWK can be auto-refunded to mobile money";
    } else if (!d.phone) {
      d.canAutoPayout = false;
      d.skipReason = "No phone number — manual follow-up required";
    } else {
      const det = detectMalawiOperator(d.phone);
      if (!det.refId) {
        d.canAutoPayout = false;
        d.skipReason = "Could not detect Airtel/TNM operator from number";
        d.normalizedPhone = det.normalized;
      } else {
        d.canAutoPayout = true;
        d.operatorRefId = det.refId;
        d.normalizedPhone = det.normalized;
      }
    }
    donors.push(d);
  }

  const totalGross = donors.reduce((s, x) => s + x.grossAmount, 0);
  const totalFees = donors.reduce((s, x) => s + x.feeAmount, 0);
  const totalNet = donors.reduce((s, x) => s + x.netAmount, 0);

  return {
    project: {
      id: project.id,
      title: project.title,
      status: project.status,
      slug: project.slug,
    },
    feePercent: FEE_RATE * 100,
    donors,
    totals: {
      donorCount: donors.length,
      totalGross,
      totalFees,
      totalNet,
      autoPayoutCount: donors.filter((d) => d.canAutoPayout).length,
      manualCount: donors.filter((d) => !d.canAutoPayout).length,
    },
  };
}

export async function executeRefund(projectId: string, reason: string) {
  const preview = await previewRefund(projectId);
  if (preview.donors.length === 0) {
    throw new Error("No held donations available to refund");
  }

  // Flag project
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: "FLAGGED",
      flagReason: reason,
      flaggedAt: new Date(),
    },
  });

  const batch = await prisma.refundBatch.create({
    data: {
      projectId,
      reason,
      status: "PROCESSING",
      totalDonated: preview.totals.totalGross,
      totalFees: preview.totals.totalFees,
      totalRefunded: 0,
      donorCount: preview.totals.donorCount,
    },
  });

  let successCount = 0;
  let failCount = 0;
  let manualCount = 0;
  let totalRefunded = 0;

  for (const d of preview.donors) {
    const item = await prisma.refundItem.create({
      data: {
        batchId: batch.id,
        donorName: d.donorName,
        email: d.email,
        phone: d.phone,
        preferredContact: d.preferredContact,
        currency: d.currency,
        grossAmount: d.grossAmount,
        feeAmount: d.feeAmount,
        netAmount: d.netAmount,
        status: d.canAutoPayout ? "PROCESSING" : "MANUAL",
        operatorRefId: d.operatorRefId,
      },
    });

    // Link donations to this refund item
    await prisma.donation.updateMany({
      where: { id: { in: d.donationIds } },
      data: { refundItemId: item.id },
    });

    if (!d.canAutoPayout) {
      manualCount++;
      await notifyRefund(d, preview.project.title, reason, false);
      await prisma.refundItem.update({
        where: { id: item.id },
        data: { notifiedAt: new Date() },
      });
      continue;
    }

    try {
      const chargeId = `rfnd-${uuidv4().slice(0, 12)}`;
      const result = await initiateMobileMoneyPayout({
        phone: d.normalizedPhone || d.phone!,
        amount: d.netAmount,
        chargeId,
        mobileMoneyOperatorRefId: d.operatorRefId!,
        email: d.email || undefined,
        firstName: d.donorName?.split(" ")[0],
        lastName: d.donorName?.split(" ").slice(1).join(" ") || undefined,
      });

      await prisma.refundItem.update({
        where: { id: item.id },
        data: {
          status: "SUCCESS",
          payoutRef: result?.data?.charge_id || result?.data?.id || chargeId,
        },
      });

      await prisma.donation.updateMany({
        where: { id: { in: d.donationIds } },
        data: { status: "REFUNDED" },
      });

      successCount++;
      totalRefunded += d.netAmount;

      await notifyRefund(d, preview.project.title, reason, true);
      await prisma.refundItem.update({
        where: { id: item.id },
        data: { notifiedAt: new Date() },
      });
    } catch (err: any) {
      failCount++;
      await prisma.refundItem.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          payoutError: err.message || "Payout failed",
        },
      });
      // Still notify that a refund was attempted / project flagged
      await notifyRefund(d, preview.project.title, reason, false, err.message);
    }
  }

  const finalStatus =
    failCount === 0 && manualCount === 0
      ? "COMPLETED"
      : successCount > 0
      ? "PARTIAL"
      : failCount > 0
      ? "FAILED"
      : "COMPLETED";

  await prisma.refundBatch.update({
    where: { id: batch.id },
    data: {
      status: finalStatus,
      successCount,
      failCount,
      manualCount,
      totalRefunded,
      completedAt: new Date(),
    },
  });

  return { batchId: batch.id, successCount, failCount, manualCount, totalRefunded };
}

async function notifyRefund(
  d: AggregatedDonor,
  projectTitle: string,
  reason: string,
  payoutSuccess: boolean,
  errorMsg?: string
) {
  const name = d.donorName || "Friend";
  const gross = d.grossAmount.toLocaleString();
  const fee = d.feeAmount.toLocaleString();
  const net = d.netAmount.toLocaleString();

  let body = `Hello ${name},\n\n`;
  body += `The project "${projectTitle}" was flagged as not legitimate.\n`;
  body += `Reason: ${reason}\n\n`;
  body += `Your total held donations: ${d.currency} ${gross}\n`;
  body += `Processing fee (10%): ${d.currency} ${fee}\n`;

  if (payoutSuccess) {
    body += `Refunded to your mobile money: ${d.currency} ${net}\n`;
  } else if (d.canAutoPayout === false) {
    body += `Automatic mobile money refund could not be completed (${d.skipReason || "manual handling required"}).\n`;
    body += `Our team will follow up regarding your refund of ${d.currency} ${net}.\n`;
  } else {
    body += `We attempted to refund ${d.currency} ${net} but the payout failed${errorMsg ? `: ${errorMsg}` : ""}.\n`;
    body += `Our team will follow up shortly.\n`;
  }

  body += `\nInu ndi thandizo lathu`;

  if (
    (d.preferredContact === "EMAIL" || d.preferredContact === "BOTH") &&
    d.email
  ) {
    await sendEmail(d.email, `Refund update – ${projectTitle}`, body);
  }
  if (
    (d.preferredContact === "SMS" || d.preferredContact === "BOTH") &&
    d.phone
  ) {
    // SMS shorter
    const sms = payoutSuccess
      ? `Thandizo: "${projectTitle}" was flagged. Your held total ${d.currency} ${gross}; fee 10% ${fee}; refunded ${net} to your mobile money. Inu ndi thandizo lathu`
      : `Thandizo: "${projectTitle}" was flagged. Refund of ${d.currency} ${net} needs follow-up. We will contact you. Inu ndi thandizo lathu`;
    await sendSMS(d.phone, sms);
  }
}
