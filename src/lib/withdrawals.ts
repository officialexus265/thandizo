import { prisma } from "./prisma";
import { projectMoneySummary } from "./developer";
import { initiateMobileMoneyPayout, detectMalawiOperator } from "./paychangu";
import { sendEmail, sendSMS } from "./notifications";
import { v4 as uuidv4 } from "uuid";

export async function getWithdrawalFeeSettings() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  return {
    withdrawalFeePercent: settings?.withdrawalFeePercent ?? 0,
    minWithdrawalAmount: settings?.minWithdrawalAmount ?? 1000,
  };
}

/**
 * Withdrawal fee structure:
 * 1) Donation platform fee already applied when donor paid (netAmount on donations).
 * 2) Optional withdrawalFeePercent on SiteSettings applied when cashing out.
 *    gross = amount user chooses to take from available balance
 *    fee = gross * withdrawalFeePercent / 100
 *    net payout to mobile money = gross - fee
 */
export async function requestWithdrawal(params: {
  projectId: string;
  developerId: string;
  /** Gross amount to deduct from available balance */
  amount: number;
  phone: string;
  ipAddress?: string | null;
}) {
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, developerId: params.developerId },
  });
  if (!project) throw new Error("Project not found");
  if (project.status === "FLAGGED") throw new Error("Project is flagged — withdrawals blocked");
  if (project.status === "DRAFT") throw new Error("Draft projects cannot withdraw");

  if (params.amount <= 0) throw new Error("Invalid amount");

  const feeSettings = await getWithdrawalFeeSettings();
  if (params.amount < feeSettings.minWithdrawalAmount) {
    throw new Error(
      `Minimum withdrawal is ${feeSettings.minWithdrawalAmount.toLocaleString()} MWK`
    );
  }

  const money = await projectMoneySummary(params.projectId);
  if (money.currency !== "MWK") {
    throw new Error("Only MWK mobile money withdrawals are supported automatically right now");
  }
  if (params.amount > money.available + 0.001) {
    throw new Error(`Amount exceeds available balance (${money.available} ${money.currency})`);
  }

  const feePercent = Math.max(0, Number(feeSettings.withdrawalFeePercent) || 0);
  const gross = Math.round(params.amount * 100) / 100;
  const feeAmount = Math.round(((gross * feePercent) / 100) * 100) / 100;
  const netPayout = Math.round((gross - feeAmount) * 100) / 100;

  if (netPayout <= 0) {
    throw new Error("Net payout after withdrawal fee must be greater than zero");
  }

  const det = detectMalawiOperator(params.phone);
  if (!det.operator || !det.refId) {
    throw new Error("Could not detect Airtel or TNM from phone number. Use a Malawi mobile number.");
  }

  const chargeId = `wd-${uuidv4().slice(0, 10)}`;

  const withdrawal = await prisma.withdrawal.create({
    data: {
      projectId: params.projectId,
      developerId: params.developerId,
      grossAmount: gross,
      feeAmount,
      amount: netPayout,
      currency: money.currency,
      phone: det.normalized.startsWith("0") ? det.normalized : `0${det.normalized.slice(-9)}`,
      status: "PROCESSING",
      ipAddress: params.ipAddress || null,
      note: `operator=${det.operator};feePercent=${feePercent}`,
    },
  });

  await prisma.developer.update({
    where: { id: params.developerId },
    data: { payoutPhone: params.phone },
  });

  try {
    const result = await initiateMobileMoneyPayout({
      amount: netPayout,
      phone: det.normalized,
      mobileMoneyOperatorRefId: det.refId,
      chargeId,
    });

    const payoutRef = result?.data?.charge_id || result?.data?.id || chargeId;

    const updated = await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: "SUCCESS",
        payoutRef: String(payoutRef),
        completedAt: new Date(),
      },
    });

    const developer = await prisma.developer.findUnique({
      where: { id: params.developerId },
    });
    const feeLine =
      feeAmount > 0
        ? `Withdrawal fee (${feePercent}%): MWK ${feeAmount.toLocaleString()}\nNet paid: MWK ${netPayout.toLocaleString()}\n`
        : `Amount paid: MWK ${netPayout.toLocaleString()}\n`;

    if (developer?.email) {
      await sendEmail(
        developer.email,
        `Withdrawal successful: ${project.title}`,
        `Hello ${developer.name},\n\n` +
          `Withdrawal for “${project.title}”:\n` +
          `From balance: MWK ${gross.toLocaleString()}\n` +
          feeLine +
          `To: ${params.phone}\n` +
          `Reference: ${payoutRef}\n\n` +
          `Note: Donation platform fees were already deducted when donors paid.\n\n` +
          `Inu ndi thandizo lathu`
      );
    }
    if (developer?.phone) {
      await sendSMS(
        developer.phone,
        `Thandizo: withdrew MWK ${gross} (net ${netPayout} after fee) for "${project.title}" to ${params.phone}. Ref ${payoutRef}`
      );
    }

    return { withdrawal: updated, result, gross, feeAmount, netPayout, feePercent };
  } catch (err: any) {
    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: "FAILED",
        payoutError: err.message || "Payout failed",
      },
    });
    throw err;
  }
}
