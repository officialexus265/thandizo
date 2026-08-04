import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const slug = req.nextUrl.searchParams.get("slug");
  try {
    let pid = projectId;
    if (!pid && slug) {
      const p = await prisma.project.findUnique({ where: { slug } });
      if (!p || p.status === "DRAFT" || p.status === "FLAGGED") {
        return NextResponse.json([]);
      }
      pid = p.id;
    }
    if (!pid) return NextResponse.json({ error: "projectId or slug required" }, { status: 400 });

    const updates = await prisma.campaignUpdate.findMany({
      where: { projectId: pid, isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(updates);
  } catch {
    return NextResponse.json([]);
  }
}
