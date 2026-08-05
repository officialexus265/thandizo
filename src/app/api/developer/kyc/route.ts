import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendSMS } from "@/lib/notifications";

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
        kycNote: null,
      },
    });

    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    const supportEmail = settings?.contactEmail || "officialnexus265@gmail.com";
    const whatsapp = settings?.adminWhatsapp || settings?.adminPhone || "";

    const emailBody =
      `Hello ${d.name},\n\n` +
      `We received your KYC documents. Your verification is under review.\n\n` +
      `This usually takes up to 3 working days.\n\n` +
      `If your campaign is urgent, contact the admin by email (${supportEmail})` +
      (whatsapp ? ` or WhatsApp (${whatsapp})` : "") +
      `.\n\n` +
      `Inu ndi thandizo lathu`;

    await sendEmail(d.email, "KYC under review — Thandizo", emailBody);
    if (d.phone) {
      await sendSMS(
        d.phone,
        `Thandizo: KYC received, under review (up to 3 working days). Urgent? Email ${supportEmail}` +
          (whatsapp ? ` or WhatsApp ${whatsapp}` : "")
      );
    }

    return NextResponse.json({ success: true, kycStatus: updated.kycStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
