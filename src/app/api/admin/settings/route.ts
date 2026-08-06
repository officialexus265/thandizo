import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  return NextResponse.json(settings || {});
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    let fee = body.refundFeePercent != null ? Number(body.refundFeePercent) : 10;
    if (isNaN(fee) || fee < 0) fee = 0;
    if (fee > 50) fee = 50;

    const data: any = {
      siteName: body.siteName,
      contactEmail: body.contactEmail,
      logoUrl: body.logoUrl || null,
      refundFeePercent: fee,
      adminPhone: body.adminPhone || null,
      adminWhatsapp: body.adminWhatsapp || body.adminPhone || null,
      callWindow: body.callWindow || null,
    };

    if (body.withdrawalFeePercent != null) data.withdrawalFeePercent = Number(body.withdrawalFeePercent);
    if (body.minWithdrawalAmount != null) data.minWithdrawalAmount = Number(body.minWithdrawalAmount);
    if (body.largeTargetThreshold != null) data.largeTargetThreshold = Number(body.largeTargetThreshold);

    // Toggles
    if (typeof body.registrationsEnabled === "boolean") data.registrationsEnabled = body.registrationsEnabled;
    if (typeof body.submissionsEnabled === "boolean") data.submissionsEnabled = body.submissionsEnabled;
    if (typeof body.withdrawalsEnabled === "boolean") data.withdrawalsEnabled = body.withdrawalsEnabled;
    if (typeof body.captchaRequired === "boolean") data.captchaRequired = body.captchaRequired;
    if (typeof body.maintenanceMode === "boolean") data.maintenanceMode = body.maintenanceMode;
    if (typeof body.kycAutoEnabled === "boolean") data.kycAutoEnabled = body.kycAutoEnabled;
    if (typeof body.kycAutoApproveEnabled === "boolean") data.kycAutoApproveEnabled = body.kycAutoApproveEnabled;
    if (body.kycAutoApproveMinScore != null) data.kycAutoApproveMinScore = Number(body.kycAutoApproveMinScore);

    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data, siteName: data.siteName || "thandizo" },
    });
    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
