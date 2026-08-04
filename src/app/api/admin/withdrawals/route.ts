import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await prisma.withdrawal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { title: true, slug: true } },
      developer: { select: { name: true, email: true, phone: true } },
    },
    take: 200,
  });

  return NextResponse.json(list);
}
