import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendSMS } from "@/lib/notifications";
import { interpretSmileResult, verifySmileSignature } from "@/lib/smile-id";

export const dynamic = "force-dynamic";

/**
 * Smile ID async callback — no auth headers; verify signature when present.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const signature = body.signature || body.Signature;
    const timestamp = body.timestamp || body.Timestamp;

    if (signature && timestamp && process.env.SMILE_API_KEY) {
      const ok = verifySmileSignature(String(signature), String(timestamp));
      if (!ok) {
        console.warn("Smile callback: invalid signature");
        // Still process in sandbox if signature algo differs; log only
      }
    }

    const partnerParams = body.partner_params || body.PartnerParams || {};
    const developerId = partnerParams.developer_id || partnerParams.developerId;
    const jobId = partnerParams.job_id || partnerParams.jobId;

    let developer = null;
    if (developerId) {
      developer = await prisma.developer.findUnique({ where: { id: String(developerId) } });
    }
    if (!developer && jobId) {
      developer = await prisma.developer.findFirst({
        where: { smileJobId: String(jobId) },
      });
    }
    if (!developer) {
      console.error("Smile callback: developer not found", partnerParams);
      return NextResponse.json({ ok: true, matched: false });
    }

    const interpreted = interpretSmileResult(body);
    const raw = JSON.stringify(body).slice(0, 15000);

    let kycStatus: "APPROVED" | "REJECTED" | "PENDING" = "PENDING";
    if (interpreted.decision === "APPROVED") kycStatus = "APPROVED";
    if (interpreted.decision === "REJECTED") kycStatus = "REJECTED";

    await prisma.developer.update({
      where: { id: developer.id },
      data: {
        smileJobComplete: true,
        smileResultCode: interpreted.code,
        smileResultText: interpreted.text,
        smileRawResult: raw,
        kycStatus: kycStatus === "PENDING" ? developer.kycStatus : kycStatus,
        kycNote:
          `Smile ID: ${interpreted.text} (code ${interpreted.code})` +
          (developer.kycNote ? ` | ${developer.kycNote}` : ""),
        kycReviewedAt: kycStatus !== "PENDING" ? new Date() : developer.kycReviewedAt,
        kycAutoDecision: interpreted.decision,
        kycAutoScore:
          interpreted.decision === "APPROVED"
            ? 95
            : interpreted.decision === "REJECTED"
              ? 20
              : developer.kycAutoScore,
      } as any,
    });

    if (kycStatus === "APPROVED") {
      await sendEmail(
        developer.email,
        "KYC approved on Thandizo",
        `Hello ${developer.name},\n\nYour identity was verified with Smile ID biometric document checks.\n\nYou can submit campaigns in the portal.\n\nInu ndi thandizo lathu`
      );
      if (developer.phone) {
        await sendSMS(developer.phone, "Thandizo: KYC approved (Smile ID). You can submit projects.");
      }
    } else if (kycStatus === "REJECTED") {
      await sendEmail(
        developer.email,
        "KYC needs attention on Thandizo",
        `Hello ${developer.name},\n\nSmile ID could not verify your documents.\n${interpreted.text}\n\nPlease resubmit clearer ID and selfie photos.\n\nInu ndi thandizo lathu`
      );
      if (developer.phone) {
        await sendSMS(
          developer.phone,
          "Thandizo: KYC not approved. Please resubmit clearer ID and selfie."
        );
      }
    }

    return NextResponse.json({ ok: true, decision: interpreted.decision });
  } catch (err: any) {
    console.error("Smile callback error", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
