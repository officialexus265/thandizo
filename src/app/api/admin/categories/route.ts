import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    let fee = body.feePercent != null ? Number(body.feePercent) : 8;
    if (isNaN(fee) || fee < 0) fee = 0;
    if (fee > 50) fee = 50;

    const slug = slugify(name, { lower: true, strict: true });
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: body.description || null,
        feePercent: fee,
        requiresReview: Boolean(body.requiresReview),
        active: body.active !== false,
        sortOrder: Number(body.sortOrder) || 0,
      },
    });
    return NextResponse.json(category);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, feePercent, requiresReview, active, name, description, sortOrder } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const data: any = {};
    if (feePercent !== undefined) {
      let fee = Number(feePercent);
      if (isNaN(fee) || fee < 0) fee = 0;
      if (fee > 50) fee = 50;
      data.feePercent = fee;
    }
    if (requiresReview !== undefined) data.requiresReview = Boolean(requiresReview);
    if (active !== undefined) data.active = Boolean(active);
    if (name !== undefined) data.name = String(name);
    if (description !== undefined) data.description = description;
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder) || 0;

    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json(category);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
