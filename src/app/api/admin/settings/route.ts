import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    let fee = body.refundFeePercent != null ? Number(body.refundFeePercent) : 10;
    const withdrawalFeePercent =
      body.withdrawalFeePercent != null ? Number(body.withdrawalFeePercent) : undefined;
    const minWithdrawalAmount =
      body.minWithdrawalAmount != null ? Number(body.minWithdrawalAmount) : undefined;
    if (isNaN(fee) || fee < 0) fee = 0;
    if (fee > 50) fee = 50;

    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {
        siteName: body.siteName,
        contactEmail: body.contactEmail,
        logoUrl: body.logoUrl || null,
        refundFeePercent: fee,
        ...(withdrawalFeePercent != null ? { withdrawalFeePercent } : {}),
        ...(minWithdrawalAmount != null ? { minWithdrawalAmount } : {}),
        adminPhone: body.adminPhone || null,
        callWindow: body.callWindow || null,
      },
      create: {
        id: "default",
        siteName: body.siteName || "thandizo",
        contactEmail: body.contactEmail || "",
        logoUrl: body.logoUrl || null,
        refundFeePercent: fee,
        ...(withdrawalFeePercent != null ? { withdrawalFeePercent } : {}),
        ...(minWithdrawalAmount != null ? { minWithdrawalAmount } : {}),
        adminPhone: body.adminPhone || null,
        callWindow: body.callWindow || null,
      },
    });
    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
