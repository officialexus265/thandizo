import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { isPublic, displayName, logoUrl, websiteUrl, status } = body;

    const updated = await prisma.partnerInterest.update({
      where: { id },
      data: {
        ...(isPublic !== undefined && { isPublic }),
        ...(displayName !== undefined && { displayName: displayName || null }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(websiteUrl !== undefined && { websiteUrl: websiteUrl || null }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ success: true, partner: updated });
  } catch (err: any) {
    console.error("Partner update error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
