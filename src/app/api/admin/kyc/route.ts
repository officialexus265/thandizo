import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications";

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
      kycNotes: true,
      kycSubmittedAt: true,
      kycReviewedAt: true,
      projects: { select: { id: true, title: true, status: true, targetAmount: true, currency: true } },
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
    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    const d = await prisma.developer.findUnique({ where: { id } });
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const kycStatus = action === "approve" ? "APPROVED" : "REJECTED";
    await prisma.developer.update({
      where: { id },
      data: {
        kycStatus,
        kycNotes: notes || null,
        kycReviewedAt: new Date(),
      },
    });

    await sendEmail(
      d.email,
      action === "approve" ? "KYC approved on Thandizo" : "KYC needs attention on Thandizo",
      action === "approve"
        ? `Hello ${d.name},\n\nYour identity verification (KYC) was approved. After your campaign is reviewed and published by admin, donors can support it.\n\nInu ndi thandizo lathu`
        : `Hello ${d.name},\n\nYour KYC was not approved.${notes ? `\n\nNote: ${notes}` : ""}\n\nPlease resubmit correct ID, selfie with ID, and verification video.\n\nInu ndi thandizo lathu`
    );

    return NextResponse.json({ success: true, kycStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
