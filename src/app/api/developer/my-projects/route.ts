import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;
  const projects = await prisma.project.findMany({
    where: { developerId },
    select: { id: true, title: true, status: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(projects);
}
