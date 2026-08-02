import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const donations = await prisma.donation.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        donorName: true,
        isAnonymous: true,
        amount: true,
        currency: true,
        createdAt: true,
        project: { select: { title: true } },
      },
    });

    const formatted = donations.map((d) => ({
      id: d.id,
      donorName: d.donorName,
      isAnonymous: d.isAnonymous,
      amount: Number(d.amount),
      currency: d.currency,
      projectTitle: d.project.title,
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    return NextResponse.json([], { status: 200 });
  }
}
