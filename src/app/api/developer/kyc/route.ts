import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendSMS } from "@/lib/notifications";
import { runAutomatedKyc } from "@/lib/kyc-auto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = (session.user as any).id as string;
  const d = await prisma.developer.findUnique({ where: { id } });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (d.bannedAt) {
    return NextResponse.json({ error: "Account banned", banned: true }, { status: 403 });
  }
  return NextResponse.json(d);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = (session.user as any).id as string;

  try {
    const d = await prisma.developer.findUnique({ where: { id } });
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (d.bannedAt) {
      return NextResponse.json({ error: "Account banned" }, { status: 403 });
    }
    if (d.kycStatus === "APPROVED") {
      return NextResponse.json({ error: "KYC already approved" }, { status: 400 });
    }

    const body = await req.json();
    const fullLegalName = String(body.fullLegalName || "").trim();
    const nationalIdNumber = String(body.nationalIdNumber || "").trim();
    const nationalIdUrl = String(body.nationalIdUrl || "").trim();
    const selfieWithIdUrl = String(body.selfieWithIdUrl || "").trim();
    const videoKycUrl = String(body.videoKycUrl || "").trim();
    const videoLanguage = String(body.videoLanguage || "EN");

    if (!fullLegalName || !nationalIdNumber || !nationalIdUrl || !selfieWithIdUrl || !videoKycUrl) {
      return NextResponse.json({ error: "All KYC fields required" }, { status: 400 });
    }

    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    const autoEnabled = (settings as any)?.kycAutoEnabled !== false;
    const autoApproveEnabled = (settings as any)?.kycAutoApproveEnabled !== false;
    const minScore = Number((settings as any)?.kycAutoApproveMinScore ?? 80);

    let kycStatus: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";
    let kycNote: string | null = null;
    let autoScore: number | null = null;
    let autoDecision: string | null = null;
    let autoReport: string | null = null;
    let reviewedAt: Date | null = null;

    if (autoEnabled) {
      const result = await runAutomatedKyc(
        {
          accountName: d.name,
          fullLegalName,
          nationalIdNumber,
          nationalIdUrl,
          selfieWithIdUrl,
          videoKycUrl,
          videoLanguage,
          email: d.email,
          phone: d.phone,
        },
        { autoApproveEnabled, autoApproveMinScore: minScore }
      );

      autoScore = result.score;
      autoDecision = result.decision;
      autoReport = JSON.stringify({ summary: result.summary, checks: result.checks });

      if (result.decision === "APPROVED") {
        kycStatus = "APPROVED";
        kycNote = result.summary;
        reviewedAt = new Date();
      } else if (result.decision === "REJECTED") {
        kycStatus = "REJECTED";
        kycNote = result.summary;
        reviewedAt = new Date();
      } else {
        kycStatus = "PENDING";
        kycNote = result.summary;
      }
    }

    const updated = await prisma.developer.update({
      where: { id },
      data: {
        fullLegalName,
        nationalIdNumber,
        nationalIdUrl,
        selfieWithIdUrl,
        videoKycUrl,
        videoLanguage,
        kycStatus,
        kycSubmittedAt: new Date(),
        kycNote,
        kycReviewedAt: reviewedAt,
        kycAutoScore: autoScore,
        kycAutoDecision: autoDecision,
        kycAutoReport: autoReport,
        kycAutoAt: autoEnabled ? new Date() : null,
      } as any,
    });

    const supportEmail = settings?.contactEmail || "officialnexus265@gmail.com";
    const whatsapp = settings?.adminWhatsapp || settings?.adminPhone || "";

    if (kycStatus === "APPROVED") {
      await sendEmail(
        d.email,
        "KYC approved on Thandizo",
        `Hello ${d.name},\n\n` +
          `Your identity verification was approved automatically after our checks.\n\n` +
          `You can now submit campaigns in the portal.\n\nInu ndi thandizo lathu`
      );
      if (d.phone) {
        await sendSMS(
          d.phone,
          "Thandizo: KYC approved. You can submit projects in the portal."
        );
      }
    } else if (kycStatus === "REJECTED") {
      await sendEmail(
        d.email,
        "KYC needs attention on Thandizo",
        `Hello ${d.name},\n\n` +
          `Automated verification could not approve your KYC.\n\n` +
          `${kycNote || ""}\n\n` +
          `Please resubmit clearer ID photo, selfie holding ID, and verification video.\n\n` +
          `Inu ndi thandizo lathu`
      );
      if (d.phone) {
        await sendSMS(
          d.phone,
          "Thandizo: KYC not approved automatically. Please resubmit clearer documents in the portal."
        );
      }
    } else {
      const emailBody =
        `Hello ${d.name},\n\n` +
        `We received your KYC documents. Automated checks scored them for review.\n\n` +
        `A team member will complete verification (usually up to 3 working days).\n\n` +
        `If urgent, email ${supportEmail}` +
        (whatsapp ? ` or WhatsApp ${whatsapp}` : "") +
        `.\n\nInu ndi thandizo lathu`;
      await sendEmail(d.email, "KYC under review — Thandizo", emailBody);
      if (d.phone) {
        await sendSMS(
          d.phone,
          `Thandizo: KYC received, under human review (up to 3 working days).`
        );
      }
      // Notify admin
      try {
        await sendEmail(
          supportEmail,
          `KYC needs human review: ${d.name}`,
          `Developer ${d.name} (${d.email}) scored ${autoScore} — decision REVIEW.\n\n${kycNote}`
        );
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({
      success: true,
      kycStatus: updated.kycStatus,
      autoDecision,
      autoScore,
      message:
        kycStatus === "APPROVED"
          ? "KYC approved automatically"
          : kycStatus === "REJECTED"
            ? "KYC rejected by automated checks — please resubmit"
            : "KYC submitted — under human review",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
