import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
        take: 5,
        select: {
          id: true,
          type: true,
          recipient: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const items: {
      id: string;
      label: string;
      count: number;
      href: string;
      tone: "amber" | "red" | "stone";
    }[] = [];

    if (kycPending > 0) {
      items.push({
        id: "kyc",
        label: "KYC waiting review",
        count: kycPending,
        href: "/admin/kyc",
        tone: "amber",
      });
    }
    if (submissionsPending > 0) {
      items.push({
        id: "submissions",
        label: "Project submissions",
        count: submissionsPending,
        href: "/admin/submissions",
        tone: "amber",
      });
    }
    if (targetRequests > 0) {
      items.push({
        id: "targets",
        label: "Target change requests",
        count: targetRequests,
        href: "/admin/target-requests",
        tone: "amber",
      });
    }
    if (draftsNeedingReview > 0) {
      items.push({
        id: "review",
        label: "Drafts need human review",
        count: draftsNeedingReview,
        href: "/admin/projects",
        tone: "amber",
      });
    }
    if (failedNotifications > 0) {
      items.push({
        id: "notify",
        label: "Failed email/SMS (7 days)",
        count: failedNotifications,
        href: "/admin/notify",
        tone: "red",
      });
    }

    return NextResponse.json({
      items,
      total: items.reduce((s, i) => s + i.count, 0),
      recentFailedLogs,
    });
  } catch (err: any) {
    console.error("alerts", err);
    return NextResponse.json({ items: [], total: 0, recentFailedLogs: [] });
  }
}
