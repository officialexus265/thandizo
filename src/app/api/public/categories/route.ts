import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        feePercent: true,
        requiresReview: true,
        description: true,
      },
    });
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json([]);
  }
}
