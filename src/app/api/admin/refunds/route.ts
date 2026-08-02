import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { previewRefund, executeRefund } from "@/lib/refunds";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");

  if (projectId) {
    try {
      const preview = await previewRefund(projectId);
      return NextResponse.json(preview);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  // List past batches
  const batches = await prisma.refundBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      project: { select: { title: true, slug: true } },
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json(batches);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { projectId, reason } = body;

    if (!projectId || !reason?.trim()) {
      return NextResponse.json(
        { error: "projectId and reason are required" },
        { status: 400 }
      );
    }

    const result = await executeRefund(projectId, reason.trim());
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Refund execute error:", err);
    return NextResponse.json({ error: err.message || "Refund failed" }, { status: 500 });
  }
}
