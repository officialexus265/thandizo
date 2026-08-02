import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { media: { orderBy: { sortOrder: "asc" } } },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      title,
      developerName,
      shortDesc,
      fullDesc,
      targetAmount,
      currency,
      status,
      isPinned,
      thumbnailUrl,
      pinOrder,
    } = body;

    const data: any = {};
    if (title !== undefined) {
      data.title = title;
      data.slug = slugify(title, { lower: true, strict: true });
    }
    if (developerName !== undefined) data.developerName = developerName || null;
    if (shortDesc !== undefined) data.shortDesc = shortDesc;
    if (fullDesc !== undefined) data.fullDesc = fullDesc;
    if (targetAmount !== undefined) data.targetAmount = targetAmount;
    if (currency !== undefined) data.currency = currency;
    if (status !== undefined) data.status = status;
    if (isPinned !== undefined) data.isPinned = isPinned;
    if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl;
    if (pinOrder !== undefined) data.pinOrder = pinOrder;

    const project = await prisma.project.update({
      where: { id },
      data,
    });

    return NextResponse.json(project);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
