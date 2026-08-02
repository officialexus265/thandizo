import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications";
import slugify from "slugify";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") || undefined;
  const list = await prisma.projectSubmission.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const id = body.id as string;
    const action = body.action as "approve" | "reject";
    const adminNotes = body.adminNotes ? String(body.adminNotes) : null;
    const scheduledNote = body.scheduledNote ? String(body.scheduledNote) : null;
    const createLiveProject = body.createLiveProject !== false;

    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const sub = await prisma.projectSubmission.findUnique({ where: { id } });
    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (sub.status !== "PENDING") {
      return NextResponse.json({ error: "Already reviewed" }, { status: 400 });
    }

    if (action === "reject") {
      await prisma.projectSubmission.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminNotes,
          reviewedAt: new Date(),
        },
      });

      await sendEmail(
        sub.developerEmail,
        `Update on your project submission: ${sub.title}`,
        `Hello ${sub.developerName},\n\n` +
          `Thank you for submitting “${sub.title}” to Thandizo.\n\n` +
          `After review, we are not able to proceed with this project at this time.\n` +
          (adminNotes ? `\nNote from the team:\n${adminNotes}\n` : "") +
          `\nYou may update your idea and submit again later.\n\n` +
          `Inu ndi thandizo lathu`
      );

      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    // APPROVE
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    });
    const adminPhone =
      settings?.adminPhone ||
      process.env.ADMIN_PHONE ||
      null;
    const callWindow =
      settings?.callWindow ||
      "Please call during business hours (CAT)";

    let projectId: string | null = null;

    if (createLiveProject) {
      let slug = slugify(sub.title, { lower: true, strict: true });
      const existing = await prisma.project.findUnique({ where: { slug } });
      if (existing) slug = `${slug}-${Date.now().toString(36)}`;

      const project = await prisma.project.create({
        data: {
          title: sub.title,
          slug,
          developerName: sub.developerName,
          shortDesc: sub.shortDesc,
          fullDesc: sub.fullDesc,
          targetAmount: sub.targetAmount,
          currency: sub.currency,
          status: "ACTIVE",
        },
      });
      projectId = project.id;
    }

    await prisma.projectSubmission.update({
      where: { id },
      data: {
        status: "APPROVED",
        adminNotes,
        scheduledNote,
        reviewedAt: new Date(),
        approvedProjectId: projectId,
      },
    });

    // Automatic email to developer — schedule a normal phone call
    const phoneLine = adminPhone
      ? `Call this number: ${adminPhone}`
      : `Reply to this email to receive the admin’s phone number.`;

    const scheduleLine = scheduledNote
      ? `\nSuggested time / note from admin:\n${scheduledNote}\n`
      : `\nPreferred call window: ${callWindow}\n`;

    await sendEmail(
      sub.developerEmail,
      `Your project was approved — please call to schedule: ${sub.title}`,
      `Hello ${sub.developerName},\n\n` +
        `Good news! Your project submission “${sub.title}” has been approved on Thandizo.\n\n` +
        `Next step: please contact the admin by a normal phone call to confirm details and schedule next steps.\n\n` +
        `${phoneLine}\n` +
        scheduleLine +
        `\nYour contact email on file: ${sub.developerEmail}\n` +
        (sub.developerPhone ? `Your phone on file: ${sub.developerPhone}\n` : "") +
        (adminNotes ? `\nMessage from admin:\n${adminNotes}\n` : "") +
        (projectId
          ? `\nA project draft/listing has been prepared on the platform for you.\n`
          : "") +
        `\nInu ndi thandizo lathu`
    );

    return NextResponse.json({
      success: true,
      status: "APPROVED",
      projectId,
      emailSent: true,
    });
  } catch (err: any) {
    console.error("submission review", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
