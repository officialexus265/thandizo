import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const range = req.nextUrl.searchParams.get("range") || "30";
  const days = Math.min(90, Math.max(7, parseInt(range, 10) || 30));
  const since = daysAgo(days);
  const today = startOfDay(new Date());

  const [
    pageViewsTotal,
    pageViewsPeriod,
    pageViewsToday,
    adViewsPeriod,
    adClicksPeriod,
    uniqueSessionsPeriod,
    topPathsRaw,
    recentEvents,
    donationSuccess,
    donationPending,
    projectCounts,
    partnerNew,
    raisedGroups,
  ] = await Promise.all([
    prisma.analyticsEvent.count({ where: { type: "page_view" } }),
    prisma.analyticsEvent.count({
      where: { type: "page_view", createdAt: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { type: "page_view", createdAt: { gte: today } },
    }),
    prisma.analyticsEvent.count({
      where: { type: "ad_view", createdAt: { gte: since } },
    }),
    prisma.analyticsEvent.count({
      where: { type: "ad_click", createdAt: { gte: since } },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        type: "page_view",
        createdAt: { gte: since },
        sessionId: { not: null },
      },
      select: { sessionId: true },
      distinct: ["sessionId"],
    }),
    prisma.analyticsEvent.groupBy({
      by: ["path"],
      where: {
        type: "page_view",
        createdAt: { gte: since },
        path: { not: null },
      },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 12,
    }),
    prisma.analyticsEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        path: true,
        label: true,
        createdAt: true,
      },
    }),
    prisma.donation.count({ where: { status: "SUCCESS" } }),
    prisma.donation.count({ where: { status: "PENDING" } }),
    prisma.project.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.partnerInterest.count({ where: { status: "NEW" } }),
    prisma.donation.groupBy({
      by: ["currency"],
      where: { status: "SUCCESS" },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  // Daily page views for chart (last `days`)
  const dailyRaw = await prisma.analyticsEvent.findMany({
    where: { type: "page_view", createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = daysAgo(days - 1 - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = 0;
  }
  for (const row of dailyRaw) {
    const key = startOfDay(row.createdAt).toISOString().slice(0, 10);
    if (key in dailyMap) dailyMap[key] += 1;
  }
  const daily = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

  const projectsByStatus: Record<string, number> = {};
  for (const p of projectCounts) {
    projectsByStatus[p.status] = p._count.status;
  }

  return NextResponse.json({
    range: days,
    visits: {
      total: pageViewsTotal,
      period: pageViewsPeriod,
      today: pageViewsToday,
      uniqueSessions: uniqueSessionsPeriod.length,
    },
    ads: {
      views: adViewsPeriod,
      clicks: adClicksPeriod,
      ctr:
        adViewsPeriod > 0
          ? Math.round((adClicksPeriod / adViewsPeriod) * 1000) / 10
          : 0,
    },
    topPages: topPathsRaw.map((r) => ({
      path: r.path,
      views: r._count.path,
    })),
    daily,
    recentEvents,
    business: {
      donationsSuccess: donationSuccess,
      donationsPending: donationPending,
      projectsByStatus,
      partnerInterestsNew: partnerNew,
      raisedByCurrency: raisedGroups.map((g) => ({
        currency: g.currency,
        total: Number(g._sum.amount || 0),
        count: g._count,
      })),
    },
  });
}
