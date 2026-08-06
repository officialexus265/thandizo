import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendSMS } from "@/lib/notifications";

/**
 * KYC is HUMAN / ADMIN REVIEW ONLY.
 * No auto-approve. No Smile ID in the live path.
 * Fundraiser submits documents → status PENDING → admin approves or rejects.
 */
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

    const updated = await prisma.developer.update({
      where: { id },
      data: {
        fullLegalName,
        nationalIdNumber,
        nationalIdUrl,
        selfieWithIdUrl,
        videoKycUrl,
        videoLanguage,
        kycStatus: "PENDING",
        kycSubmittedAt: new Date(),
        kycNote: "Awaiting admin (human) review only",
        kycReviewedAt: null,
        // Clear any previous auto/Smile decisions
        kycAutoScore: null,
        kycAutoDecision: null,
        kycAutoReport: null,
        kycAutoAt: null,
        smileJobComplete: false,
        smileResultCode: null,
        smileResultText: null,
      } as any,
    });

    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    const supportEmail = settings?.contactEmail || "officialnexus265@gmail.com";
    const whatsapp = settings?.adminWhatsapp || settings?.adminPhone || "";

    const userEmailBody =
      `Hello ${d.name},\n\n` +
      `We received your KYC documents.\n\n` +
      `Verification is done by our admin team only (manual review).\n` +
      `This usually takes up to 3 working days.\n\n` +
      `If your campaign is urgent, contact us by email (${supportEmail})` +
      (whatsapp ? ` or WhatsApp (${whatsapp})` : "") +
      `.\n\n` +
      `Inu ndi thandizo lathu`;

    await sendEmail(d.email, "KYC under admin review — Thandizo", userEmailBody);
    if (d.phone) {
      await sendSMS(
        d.phone,
        `Thandizo: KYC received. Admin is reviewing (up to 3 working days). Urgent? Email ${supportEmail}`
      );
    }

    // Notify admin
    try {
      await sendEmail(
        supportEmail,
        `New KYC to review: ${fullLegalName || d.name}`,
        `A fundraiser submitted KYC for manual review.\n\n` +
          `Name: ${fullLegalName}\nAccount: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone || "—"}\n` +
          `ID number: ${nationalIdNumber}\n\n` +
          `Open Admin → KYC to approve or reject.`
      );
    } catch (e) {
      console.error("Admin KYC notify failed", e);
    }

    return NextResponse.json({
      success: true,
      kycStatus: updated.kycStatus,
      message:
        "KYC submitted. An admin will review your documents manually (usually up to 3 working days).",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
