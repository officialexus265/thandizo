import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;

  try {
    const body = await req.json();
    const projectId = body.projectId as string;
    const requestedTarget = Number(body.requestedTarget);
    const reason = body.reason ? String(body.reason) : null;

    if (!projectId || !requestedTarget || requestedTarget <= 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, developerId },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const pending = await prisma.targetChangeRequest.findFirst({
      where: { projectId, status: "PENDING" },
    });
    if (pending) {
      return NextResponse.json(
        { error: "You already have a pending target change request" },
        { status: 400 }
      );
    }

    const row = await prisma.targetChangeRequest.create({
      data: {
        projectId,
        developerId,
        currentTarget: project.targetAmount,
        requestedTarget,
        reason,
        status: "PENDING",
      },
    });

    const adminEmail =
      process.env.ADMIN_EMAIL ||
      (await prisma.siteSettings.findUnique({ where: { id: "default" } }))
        ?.contactEmail ||
      "officialnexus265@gmail.com";

    await sendEmail(
      adminEmail,
      `Target change request: ${project.title}`,
      `Developer requested a target change.\n\n` +
        `Project: ${project.title}\n` +
        `Current: ${project.currency} ${project.targetAmount}\n` +
        `Requested: ${project.currency} ${requestedTarget}\n` +
        `Reason: ${reason || "—"}\n\n` +
        `Review in admin: /admin/target-requests`
    );

    return NextResponse.json({ success: true, id: row.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
