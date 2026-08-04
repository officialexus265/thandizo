import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const owned = await prisma.project.findFirst({
    where: { id: projectId, developerId },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates = await prisma.campaignUpdate.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(updates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;

  try {
    const body = await req.json();
    const projectId = String(body.projectId || "");
    const title = String(body.title || "").trim();
    const bodyText = String(body.body || "").trim();
    const isPublic = body.isPublic !== false;

    if (!projectId || !title || !bodyText) {
      return NextResponse.json({ error: "projectId, title, and body required" }, { status: 400 });
    }

    const owned = await prisma.project.findFirst({
      where: { id: projectId, developerId },
    });
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const row = await prisma.campaignUpdate.create({
      data: {
        projectId,
        developerId,
        title,
        body: bodyText,
        isPublic,
      },
    });
    return NextResponse.json(row);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const row = await prisma.campaignUpdate.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const owned = await prisma.project.findFirst({
    where: { id: row.projectId, developerId },
  });
  if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.campaignUpdate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
