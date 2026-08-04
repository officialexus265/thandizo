import { prisma } from "./prisma";
import { projectMoneySummary } from "./developer";
import { initiateMobileMoneyPayout, detectMalawiOperator } from "./paychangu";
import { sendEmail, sendSMS } from "./notifications";
import { v4 as uuidv4 } from "uuid";

export async function requestWithdrawal(params: {
  projectId: string;
  developerId: string;
  amount: number;
  phone: string;
}) {
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, developerId: params.developerId },
  });
  if (!project) throw new Error("Project not found");
  if (project.status === "FLAGGED") throw new Error("Project is flagged — withdrawals blocked");
  if (project.status === "DRAFT") throw new Error("Draft projects cannot withdraw");

  if (params.amount <= 0) throw new Error("Invalid amount");

  const money = await projectMoneySummary(params.projectId);
  if (money.currency !== "MWK") {
    throw new Error("Only MWK mobile money withdrawals are supported automatically right now");
  }
  if (params.amount > money.available + 0.001) {
    throw new Error(`Amount exceeds available balance (${money.available} ${money.currency})`);
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
      amount: params.amount,
      currency: money.currency,
      phone: det.normalized.startsWith("0") ? det.normalized : `0${det.normalized.slice(-9)}`,
      status: "PROCESSING",
      note: `operator=${det.operator}`,
    },
  });

  // Save payout phone on developer for next time
  await prisma.developer.update({
    where: { id: params.developerId },
    data: { payoutPhone: params.phone },
  });

  try {
    const result = await initiateMobileMoneyPayout({
      amount: params.amount,
      phone: det.normalized,
      mobileMoneyOperatorRefId: det.refId,
      chargeId,
    });

    const payoutRef =
      result?.data?.charge_id || result?.data?.id || chargeId;

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
    if (developer?.email) {
      await sendEmail(
        developer.email,
        `Withdrawal successful: ${project.title}`,
        `Hello ${developer.name},\n\n` +
          `Your withdrawal of MWK ${params.amount.toLocaleString()} for “${project.title}” was sent to ${params.phone}.\n` +
          `Reference: ${payoutRef}\n\n` +
          `Platform fees were already deducted from donations when donors paid.\n\n` +
          `Inu ndi thandizo lathu`
      );
    }
    if (developer?.phone) {
      await sendSMS(
        developer.phone,
        `Thandizo: MWK ${params.amount} withdrawn for "${project.title}" to ${params.phone}. Ref ${payoutRef}. Inu ndi thandizo lathu`
      );
    }

    return { withdrawal: updated, result };
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
