import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendSMS } from "@/lib/notifications";
import slugify from "slugify";
import { ensureDeveloperWithCode } from "@/lib/developer";
import { computeReviewRequired } from "@/lib/review";

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
    const createDraftProject = body.createDraftProject !== false;

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

      if (sub.developerPhone) {
        await sendSMS(
          sub.developerPhone,
          `Thandizo: your project submission “${sub.title}” was not approved. Check your email for details.`
        );
      }

      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    // APPROVE — no phone call required
    let portalCode: string | null = null;
    let portalDeveloperId: string | null = null;
    let projectId: string | null = null;
    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    const siteName = settings?.siteName || "thandizo";

    if (createDraftProject) {
      let slug = slugify(sub.title, { lower: true, strict: true });
      const existing = await prisma.project.findUnique({ where: { slug } });
      if (existing) slug = `${slug}-${Date.now().toString(36)}`;

      const { developerId, accessCode } = await ensureDeveloperWithCode({
        name: sub.developerName,
        email: sub.developerEmail,
        phone: sub.developerPhone,
      });
      portalCode = accessCode;
      portalDeveloperId = developerId;

      const reviewRequired = await computeReviewRequired({
        categoryId: sub.categoryId,
        targetAmount: sub.targetAmount,
      });

      const project = await prisma.project.create({
        data: {
          title: sub.title,
          slug,
          developerName: sub.developerName,
          developerId,
          categoryId: sub.categoryId || null,
          shortDesc: sub.shortDesc,
          fullDesc: sub.fullDesc,
          targetAmount: sub.targetAmount,
          currency: sub.currency,
          status: "DRAFT",
          reviewRequired,
          reviewCompleted: false,
        },
      });
      projectId = project.id;
    }

    await prisma.projectSubmission.update({
      where: { id },
      data: {
        status: "APPROVED",
        adminNotes,
        reviewedAt: new Date(),
        approvedProjectId: projectId,
      },
    });

    await sendEmail(
      sub.developerEmail,
      `Your project was approved: ${sub.title}`,
      `Hello ${sub.developerName},\n\n` +
        `Good news — your submission “${sub.title}” was approved on ${siteName}.\n\n` +
        `It is saved as a DRAFT and is not public yet.\n\n` +
        `Next steps (all in the portal — no phone call required):\n` +
        `1. Sign in to the fundraiser portal\n` +
        `2. Verify your email and phone\n` +
        `3. Complete KYC (required before any campaign goes live)\n` +
        `4. Set a password + security question for account recovery\n` +
        `5. Admin publishes after review so donors can fund\n\n` +
        (portalCode
          ? `Your portal access code: ${portalCode}\nKeep it private.\n\n`
          : "") +
        `Inu ndi thandizo lathu`
    );

    if (sub.developerPhone) {
      await sendSMS(
        sub.developerPhone,
        `Thandizo: “${sub.title}” was approved as a draft. Complete KYC in the portal if needed. No phone call required.`
      );
    }

    return NextResponse.json({
      success: true,
      status: "APPROVED",
      projectId,
      developerId: portalDeveloperId,
      emailSent: true,
    });
  } catch (err: any) {
    console.error("submission review", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
