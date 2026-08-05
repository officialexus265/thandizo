import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SCOPE = "admin";

async function buildRawItems() {
  const [
    kycPending,
    submissionsPending,
    targetRequests,
    draftsNeedingReview,
    failedNotifications,
    recentFailedLogs,
  ] = await Promise.all([
    prisma.developer.count({ where: { kycStatus: "PENDING" } }),
    prisma.projectSubmission.count({ where: { status: "PENDING" } }),
    prisma.targetChangeRequest.count({ where: { status: "PENDING" } }),
    prisma.project.count({
      where: {
        status: "DRAFT",
        reviewRequired: true,
        reviewCompleted: false,
      },
    }),
    prisma.notificationLog.count({
      where: {
        status: { startsWith: "failed" },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.notificationLog.findMany({
      where: {
        OR: [
          { status: { startsWith: "failed" } },
          { status: { startsWith: "skipped" } },
          { status: "logged_no_key" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        recipient: true,
        status: true,
        createdAt: true,
        message: true,
      },
    }),
  ]);

  const raw: {
    id: string;
    label: string;
    count: number;
    href: string;
    tone: "amber" | "red" | "stone";
    description: string;
  }[] = [];

  if (kycPending > 0) {
    raw.push({
      id: "kyc",
      label: "KYC waiting review",
      count: kycPending,
      href: "/admin/kyc",
      tone: "amber",
      description: "Fundraisers submitted ID verification.",
    });
  }
  if (submissionsPending > 0) {
    raw.push({
      id: "submissions",
      label: "Project submissions",
      count: submissionsPending,
      href: "/admin/submissions",
      tone: "amber",
      description: "New campaigns waiting for approval.",
    });
  }
  if (targetRequests > 0) {
    raw.push({
      id: "targets",
      label: "Target change requests",
      count: targetRequests,
      href: "/admin/target-requests",
      tone: "amber",
      description: "Owners asked to change fundraising targets.",
    });
  }
  if (draftsNeedingReview > 0) {
    raw.push({
      id: "review",
      label: "Drafts need human review",
      count: draftsNeedingReview,
      href: "/admin/projects",
      tone: "amber",
      description: "Mark review done, then Publish.",
    });
  }
  if (failedNotifications > 0) {
    raw.push({
      id: "notify_fail",
      label: "Failed email/SMS (7 days)",
      count: failedNotifications,
      href: "/admin/notify",
      tone: "red",
      description: "Delivery problems — check Notify tests.",
    });
  }

  return { raw, recentFailedLogs };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { raw, recentFailedLogs } = await buildRawItems();
    const dismissals = await prisma.alertDismissal.findMany({
      where: { scope: SCOPE },
    });
    const map = new Map(dismissals.map((d) => [d.alertKey, d.countAtDismiss]));

    const items = raw.filter((item) => {
      const dismissedAt = map.get(item.id);
      if (dismissedAt === undefined) return true;
      // Show again only if new items arrived (count increased)
      return item.count > dismissedAt;
    });

    return NextResponse.json({
      items,
      allItems: raw,
      dismissals: dismissals.map((d) => ({
        alertKey: d.alertKey,
        countAtDismiss: d.countAtDismiss,
        updatedAt: d.updatedAt,
      })),
      total: items.reduce((s, i) => s + i.count, 0),
      recentFailedLogs,
    });
  } catch (err: any) {
    console.error("alerts", err);
    return NextResponse.json({
      items: [],
      allItems: [],
      total: 0,
      recentFailedLogs: [],
    });
  }
}

/** Dismiss one or all visible alerts (stores count so new items reappear) */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = String(body.action || "dismiss");
    const { raw } = await buildRawItems();

    if (action === "clear-all") {
      for (const item of raw) {
        await prisma.alertDismissal.upsert({
          where: {
            scope_alertKey: { scope: SCOPE, alertKey: item.id },
          },
          create: {
            scope: SCOPE,
            alertKey: item.id,
            countAtDismiss: item.count,
          },
          update: { countAtDismiss: item.count },
        });
      }
      return NextResponse.json({ success: true, cleared: raw.length });
    }

    if (action === "dismiss") {
      const alertKey = String(body.alertKey || "");
      const item = raw.find((i) => i.id === alertKey);
      const count = item?.count ?? Number(body.count) ?? 0;
      if (!alertKey) {
        return NextResponse.json({ error: "alertKey required" }, { status: 400 });
      }
      await prisma.alertDismissal.upsert({
        where: {
          scope_alertKey: { scope: SCOPE, alertKey },
        },
        create: { scope: SCOPE, alertKey, countAtDismiss: count },
        update: { countAtDismiss: count },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "reset") {
      // Show all again
      await prisma.alertDismissal.deleteMany({ where: { scope: SCOPE } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
