import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { category: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      feePercent: project.category?.feePercent ?? 0,
      categoryName: project.category?.name ?? null,
      requiresReview: project.category?.requiresReview ?? false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
