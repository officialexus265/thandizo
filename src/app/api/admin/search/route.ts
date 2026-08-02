import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({
      projects: [],
      donations: [],
      partners: [],
      query: q,
    });
  }

  const term = q.slice(0, 100);

  const [projects, donations, partners] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { shortDesc: { contains: term, mode: "insensitive" } },
          { fullDesc: { contains: term, mode: "insensitive" } },
          { slug: { contains: term, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        raisedAmount: true,
        targetAmount: true,
        currency: true,
        donorCount: true,
        createdAt: true,
      },
    }),
    prisma.donation.findMany({
      where: {
        OR: [
          { donorName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
          { phone: { contains: term, mode: "insensitive" } },
          { txRef: { contains: term, mode: "insensitive" } },
          { message: { contains: term, mode: "insensitive" } },
          { project: { title: { contains: term, mode: "insensitive" } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        project: { select: { title: true, slug: true, id: true } },
      },
    }),
    prisma.partnerInterest.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { displayName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
          { phone: { contains: term, mode: "insensitive" } },
          { message: { contains: term, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        project: { select: { title: true, slug: true } },
      },
    }),
  ]);

  return NextResponse.json({
    projects,
    donations,
    partners,
    query: term,
  });
}
