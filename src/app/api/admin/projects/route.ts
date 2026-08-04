import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";
import { computeReviewRequired } from "@/lib/review";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, developerName, shortDesc, fullDesc, targetAmount, currency, status, isPinned, slug: providedSlug, categoryId } = body;

    if (!title || !shortDesc || !fullDesc || !targetAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let slug = providedSlug || slugify(title, { lower: true, strict: true });

    // Ensure unique slug
    const existing = await prisma.project.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const reviewRequired = await computeReviewRequired({
      categoryId: categoryId || null,
      targetAmount,
    });

    const project = await prisma.project.create({
      data: {
        title,
        developerName: developerName || null,
        categoryId: categoryId || null,
        slug,
        shortDesc,
        fullDesc,
        targetAmount,
        currency: currency || "MWK",
        status: status || "ACTIVE",
        isPinned: !!isPinned,
        pinOrder: isPinned ? 1 : 0,
        reviewRequired,
        reviewCompleted: false,
      },
    });

    return NextResponse.json({ id: project.id, slug: project.slug });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(projects);
}
