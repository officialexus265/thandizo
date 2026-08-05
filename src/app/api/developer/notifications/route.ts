import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectMoneySummary } from "@/lib/developer";

async function buildItems(developerId: string) {
  const developer = await prisma.developer.findUnique({
    where: { id: developerId },
  });
  if (!developer) return { raw: [] as any[], developer: null, targetRequests: [] as any[] };

  const projects = await prisma.project.findMany({
    where: { developerId },
    select: {
      id: true,
      title: true,
      status: true,
      slug: true,
    },
  });

  const targetRequests = await prisma.targetChangeRequest.findMany({
    where: { developerId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { project: { select: { title: true } } },
  });

  const raw: {
    id: string;
    label: string;
    count: number;
    href: string;
    tone: "amber" | "red" | "green" | "stone";
    description: string;
  }[] = [];

  if (developer.kycStatus === "NOT_STARTED" || developer.kycStatus === "REJECTED") {
    raw.push({
      id: "kyc_needed",
      label: developer.kycStatus === "REJECTED" ? "KYC rejected — resubmit" : "Complete KYC",
      count: 1,
      href: "/developer/kyc",
      tone: "amber",
      description:
        developer.kycStatus === "REJECTED"
          ? developer.kycNote || "Please resubmit your documents."
          : "Required before publish and withdrawals.",
    });
  } else if (developer.kycStatus === "PENDING") {
    raw.push({
      id: "kyc_pending",
      label: "KYC under review",
      count: 1,
      href: "/developer/kyc",
      tone: "stone",
      description: "Admin is reviewing your documents.",
    });
  } else if (developer.kycStatus === "APPROVED") {
    raw.push({
      id: "kyc_ok",
      label: "KYC approved",
      count: 1,
      href: "/developer/kyc",
      tone: "green",
      description: "You can withdraw when funds are available.",
    });
  }

  const drafts = projects.filter((p) => p.status === "DRAFT");
  if (drafts.length > 0) {
    raw.push({
      id: "drafts",
      label: "Draft campaigns",
      count: drafts.length,
      href: "/developer",
      tone: "stone",
      description: "Waiting for admin to publish after review.",
    });
  }

  const pendingTargets = targetRequests.filter((t) => t.status === "PENDING");
  if (pendingTargets.length > 0) {
    raw.push({
      id: "targets_pending",
      label: "Target change pending",
      count: pendingTargets.length,
      href: "/developer",
      tone: "amber",
      description: "Waiting for admin decision.",
    });
  }

  for (const t of targetRequests.filter((x) => x.status !== "PENDING").slice(0, 5)) {
    raw.push({
      id: `target_${t.id}`,
      label: `Target ${t.status.toLowerCase()}: ${t.project.title}`,
      count: 1,
      href: `/developer/projects/${t.projectId}`,
      tone: t.status === "APPROVED" ? "green" : "red",
      description: t.adminNote || `Request was ${t.status.toLowerCase()}.`,
    });
  }

  for (const p of projects) {
    if (p.status === "FLAGGED" || p.status === "DRAFT") continue;
    try {
      const money = await projectMoneySummary(p.id);
      if (money.available > 0) {
        raw.push({
          id: `withdraw_${p.id}`,
          label: `Withdraw available — ${p.title}`,
          count: 1,
          href: "/developer/withdrawals",
          tone: "green",
          description: `${money.currency} ${money.available.toLocaleString()} ready.`,
        });
      }
    } catch {
      /* ignore */
    }
  }

  return { raw, developer, targetRequests };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;
  const scope = `developer:${developerId}`;

  try {
    const { raw, developer, targetRequests } = await buildItems(developerId);
    const dismissals = await prisma.alertDismissal.findMany({ where: { scope } });
    const map = new Map(dismissals.map((d) => [d.alertKey, d.countAtDismiss]));
    const items = raw.filter((item) => {
      const d = map.get(item.id);
      if (d === undefined) return true;
      return item.count > d;
    });

    return NextResponse.json({
      items,
      allItems: raw,
      total: items.length,
      kycStatus: developer?.kycStatus,
      targetRequests,
    });
  } catch (err: any) {
    return NextResponse.json({ items: [], total: 0, error: err.message });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;
  const scope = `developer:${developerId}`;

  try {
    const body = await req.json();
    const action = String(body.action || "dismiss");
    const { raw } = await buildItems(developerId);

    if (action === "clear-all") {
      for (const item of raw) {
        await prisma.alertDismissal.upsert({
          where: { scope_alertKey: { scope, alertKey: item.id } },
          create: { scope, alertKey: item.id, countAtDismiss: item.count },
          update: { countAtDismiss: item.count },
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "dismiss") {
      const alertKey = String(body.alertKey || "");
      const count = Number(body.count) || 1;
      if (!alertKey) {
        return NextResponse.json({ error: "alertKey required" }, { status: 400 });
      }
      await prisma.alertDismissal.upsert({
        where: { scope_alertKey: { scope, alertKey } },
        create: { scope, alertKey, countAtDismiss: count },
        update: { countAtDismiss: count },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "reset") {
      await prisma.alertDismissal.deleteMany({ where: { scope } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
