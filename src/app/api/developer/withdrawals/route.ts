import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectMoneySummary } from "@/lib/developer";
import { requestWithdrawal } from "@/lib/withdrawals";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;
  const projectId = req.nextUrl.searchParams.get("projectId");

  const where: any = { developerId };
  if (projectId) where.projectId = projectId;

  const list = await prisma.withdrawal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { project: { select: { title: true, slug: true } } },
  });

  let money = null;
  if (projectId) {
    const owned = await prisma.project.findFirst({
      where: { id: projectId, developerId },
    });
    if (owned) money = await projectMoneySummary(projectId);
  }

  const developer = await prisma.developer.findUnique({
    where: { id: developerId },
    select: { payoutPhone: true, phone: true, kycStatus: true },
  });

  return NextResponse.json({ withdrawals: list, money, developer });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;

  try {
    const body = await req.json();
    const projectId = String(body.projectId || "");
    const amount = Number(body.amount);
    const phone = String(body.phone || "").trim();

    if (!projectId || !amount || !phone) {
      return NextResponse.json({ error: "projectId, amount, and phone required" }, { status: 400 });
    }

    const developer = await prisma.developer.findUnique({ where: { id: developerId } });
    if (!developer || developer.kycStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "KYC must be approved before withdrawing" },
        { status: 400 }
      );
    }

    const result = await requestWithdrawal({
      projectId,
      developerId,
      amount,
      phone,
    });

    return NextResponse.json({ success: true, withdrawal: result.withdrawal });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Withdrawal failed" }, { status: 400 });
  }
}
