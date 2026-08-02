import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: { siteName: true, logoUrl: true },
    });
    return NextResponse.json(settings || { siteName: "thandizo", logoUrl: null });
  } catch {
    return NextResponse.json({ siteName: "thandizo", logoUrl: null });
  }
}
