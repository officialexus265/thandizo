import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = (session.user as any).id as string;
  const d = await prisma.developer.findUnique({ where: { id } });
  return NextResponse.json(d);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = (session.user as any).id as string;

  try {
    const body = await req.json();
    const fullLegalName = String(body.fullLegalName || "").trim();
    const nationalIdNumber = String(body.nationalIdNumber || "").trim();
    const nationalIdUrl = String(body.nationalIdUrl || "").trim();
    const selfieWithIdUrl = String(body.selfieWithIdUrl || "").trim();
    const videoKycUrl = String(body.videoKycUrl || "").trim();
    const videoLanguage = body.videoLanguage === "NY" ? "NY" : "EN";

    if (!fullLegalName || !nationalIdNumber || !nationalIdUrl || !selfieWithIdUrl || !videoKycUrl) {
      return NextResponse.json(
        { error: "All KYC fields are required: legal name, ID number, ID image, selfie with ID, and video." },
        { status: 400 }
      );
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
        kycNotes: null,
      },
    });

    return NextResponse.json({ success: true, kycStatus: updated.kycStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
