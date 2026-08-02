import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ projects: [], partners: [], query: q });
  }

  const term = q.slice(0, 100);

  const [projects, partners] = await Promise.all([
    prisma.project.findMany({
      where: {
        status: { in: ["ACTIVE", "FUNDED"] },
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { shortDesc: { contains: term, mode: "insensitive" } },
          { fullDesc: { contains: term, mode: "insensitive" } },
          { slug: { contains: term, mode: "insensitive" } },
        ],
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 30,
      select: {
        id: true,
        title: true,
        slug: true,
        shortDesc: true,
        thumbnailUrl: true,
        status: true,
        targetAmount: true,
        raisedAmount: true,
        currency: true,
        donorCount: true,
      },
    }),
    // Partners / "developers" promoted publicly
    prisma.partnerInterest.findMany({
      where: {
        isPublic: true,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { displayName: { contains: term, mode: "insensitive" } },
          { message: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: {
        id: true,
        name: true,
        displayName: true,
        logoUrl: true,
        websiteUrl: true,
        message: true,
        project: { select: { title: true, slug: true } },
      },
    }),
  ]);

  return NextResponse.json({ projects, partners, query: term });
}
