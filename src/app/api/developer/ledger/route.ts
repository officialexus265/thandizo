import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectMoneySummary } from "@/lib/developer";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;

  const developer = await prisma.developer.findUnique({
    where: { id: developerId },
  });
  if (!developer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const projects = await prisma.project.findMany({
    where: { developerId },
    orderBy: { createdAt: "desc" },
  });

  const projectStats = [];
  let lifetimeRaised = 0;
  let lifetimeFees = 0;
  let lifetimeWithdrawn = 0;

  for (const p of projects) {
    const money = await projectMoneySummary(p.id);
    lifetimeRaised += money.collected;
    lifetimeFees += money.fees;
    lifetimeWithdrawn += money.withdrawn;
    projectStats.push({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      createdAt: p.createdAt,
      currency: money.currency,
      raised: money.collected,
      fees: money.fees,
      available: money.available,
      withdrawn: money.withdrawn,
      donorCount: money.donationCount,
    });
  }

  const withdrawals = await prisma.withdrawal.findMany({
    where: { developerId },
    orderBy: { createdAt: "desc" },
    include: { project: { select: { title: true } } },
  });

  return NextResponse.json({
    account: {
      createdAt: developer.createdAt,
      email: developer.email,
      phone: developer.phone,
      emailVerified: !!developer.emailVerifiedAt,
      phoneVerified: !!developer.phoneVerifiedAt,
      kycStatus: developer.kycStatus,
    },
    lifetime: {
      raised: lifetimeRaised,
      fees: lifetimeFees,
      withdrawn: lifetimeWithdrawn,
      projectCount: projects.length,
    },
    projects: projectStats,
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      amount: Number(w.amount),
      currency: w.currency,
      phone: w.phone,
      status: w.status,
      projectTitle: w.project.title,
      createdAt: w.createdAt,
      completedAt: w.completedAt,
      payoutRef: w.payoutRef,
    })),
  });
}
