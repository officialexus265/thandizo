import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendSMS } from "@/lib/notifications";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const list = await prisma.developer.findMany({
    where: { kycStatus: { in: ["PENDING", "APPROVED", "REJECTED"] } },
    orderBy: [{ kycStatus: "asc" }, { kycSubmittedAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      fullLegalName: true,
      nationalIdNumber: true,
      nationalIdUrl: true,
      selfieWithIdUrl: true,
      videoKycUrl: true,
      videoLanguage: true,
      kycStatus: true,
      kycNote: true,
      kycSubmittedAt: true,
      kycReviewedAt: true,
      kycAutoScore: true,
      kycAutoDecision: true,
      kycAutoReport: true,
      kycAutoAt: true,
      bannedAt: true,
      banReason: true,
      projects: {
        select: {
          id: true,
          title: true,
          status: true,
          targetAmount: true,
          currency: true,
        },
      },
    },
  });
  return NextResponse.json(list);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, action, notes } = body;
    if (!id || !["approve", "reject", "ban", "unban"].includes(action)) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    const d = await prisma.developer.findUnique({ where: { id } });
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "ban") {
      await prisma.developer.update({
        where: { id },
        data: {
          bannedAt: new Date(),
          banReason: notes || "Policy violation",
        },
      });
      const msg =
        `Hello ${d.name},\n\n` +
        `Your Thandizo fundraiser account has been banned/blocked.\n` +
        `Reason: ${notes || "Policy violation"}\n\n` +
        `Account contacts on file:\n` +
        `Email: ${d.email}\n` +
        `Phone: ${d.phone || "—"}\n\n` +
        `You may register a new account later using the same email or phone if you resolve the issue with support.\n\n` +
        `Inu ndi thandizo lathu`;
      await sendEmail(d.email, "Thandizo account banned", msg);
      if (d.phone) await sendSMS(d.phone, `Thandizo: your fundraiser account was banned. Email ${d.email}. Contact support if needed.`);
      return NextResponse.json({ success: true, banned: true });
    }

    if (action === "unban") {
      await prisma.developer.update({
        where: { id },
        data: { bannedAt: null, banReason: null },
      });
      await sendEmail(
        d.email,
        "Thandizo account restored",
        `Hello ${d.name},\n\nYour fundraiser account access has been restored.\n\nInu ndi thandizo lathu`
      );
      if (d.phone) {
        await sendSMS(d.phone, "Thandizo: your fundraiser account has been restored.");
      }
      return NextResponse.json({ success: true, banned: false });
    }

    const kycStatus = action === "approve" ? "APPROVED" : "REJECTED";
    await prisma.developer.update({
      where: { id },
      data: {
        kycStatus,
        kycNote: notes || null,
        kycReviewedAt: new Date(),
      },
    });

    if (action === "approve") {
      const emailBody =
        `Hello ${d.name},\n\n` +
        `Your identity verification (KYC) was approved.\n\n` +
        `You can now manage campaigns in the portal. Admin will publish campaigns after any required review.\n\n` +
        `Inu ndi thandizo lathu`;
      await sendEmail(d.email, "KYC approved on Thandizo", emailBody);
      if (d.phone) {
        await sendSMS(
          d.phone,
          "Thandizo: KYC approved. You may proceed with campaigns after admin publish. Inu ndi thandizo lathu"
        );
      }
    } else {
      const emailBody =
        `Hello ${d.name},\n\n` +
        `Your KYC was not approved.` +
        (notes ? `\n\nNote: ${notes}` : "") +
        `\n\nPlease resubmit correct national ID, selfie holding ID, and verification video.\n\n` +
        `Inu ndi thandizo lathu`;
      await sendEmail(d.email, "KYC needs attention on Thandizo", emailBody);
      if (d.phone) {
        await sendSMS(
          d.phone,
          "Thandizo: KYC was not approved. Please resubmit documents in the portal."
        );
      }
    }

    return NextResponse.json({ success: true, kycStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
