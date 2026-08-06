import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: {
        siteName: true,
        logoUrl: true,
        contactEmail: true,
        withdrawalFeePercent: true,
        minWithdrawalAmount: true,
      },
    });
    return NextResponse.json({
      siteName: settings?.siteName || "thandizo",
      logoUrl: settings?.logoUrl || null,
      contactEmail: settings?.contactEmail || null,
      withdrawalFeePercent: settings?.withdrawalFeePercent ?? 0,
      minWithdrawalAmount: settings?.minWithdrawalAmount ?? 1000,
      turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
      captchaEnabled: Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    });
  } catch {
    return NextResponse.json({
      siteName: "thandizo",
      logoUrl: null,
      turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
      captchaEnabled: false,
    });
  }
}
