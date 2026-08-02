import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const list = await prisma.targetChangeRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { title: true, currency: true } },
      developer: { select: { name: true, email: true } },
    },
  });
  return NextResponse.json(list);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, action, adminNote } = body;
    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    const row = await prisma.targetChangeRequest.findUnique({
      where: { id },
      include: { project: true, developer: true },
    });
    if (!row || row.status !== "PENDING") {
      return NextResponse.json({ error: "Not pending" }, { status: 400 });
    }

    if (action === "approve") {
      await prisma.project.update({
        where: { id: row.projectId },
        data: { targetAmount: row.requestedTarget },
      });
      await prisma.targetChangeRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          adminNote: adminNote || null,
          reviewedAt: new Date(),
        },
      });
      await sendEmail(
        row.developer.email,
        `Target change approved: ${row.project.title}`,
        `Hello ${row.developer.name},\n\nYour request to change the target for "${row.project.title}" was approved.\n` +
          `New target: ${row.project.currency} ${row.requestedTarget}\n\nInu ndi thandizo lathu`
      );
    } else {
      await prisma.targetChangeRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminNote: adminNote || null,
          reviewedAt: new Date(),
        },
      });
      await sendEmail(
        row.developer.email,
        `Target change not approved: ${row.project.title}`,
        `Hello ${row.developer.name},\n\nYour target change request for "${row.project.title}" was not approved.\n` +
          (adminNote ? `Note: ${adminNote}\n` : "") +
          `\nInu ndi thandizo lathu`
      );
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
