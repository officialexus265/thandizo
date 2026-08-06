import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeatureFlags } from "@/lib/features";
import { sendEmail, sendSMS } from "@/lib/notifications";
import slugify from "slugify";

/**
 * Simplified flow:
 * - KYC approved developer submits a full campaign
 * - Category requiresReview (Medical, Education, Emergency…) → DRAFT + admin review
 * - Other categories → ACTIVE immediately (live)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const developerId = (session.user as any).id as string;

  try {
    const flags = await getFeatureFlags();
    if (flags.maintenanceMode) {
      return NextResponse.json({ error: "Site is in maintenance mode" }, { status: 503 });
    }
    if (!flags.submissionsEnabled) {
      return NextResponse.json({ error: "New project submissions are temporarily closed" }, { status: 403 });
    }

    const developer = await prisma.developer.findUnique({ where: { id: developerId } });
    if (!developer) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (developer.bannedAt) {
      return NextResponse.json({ error: "Account banned" }, { status: 403 });
    }
    if (developer.kycStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Complete KYC approval before submitting a project" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const title = String(body.title || "").trim();
    const fundraiserName = String(body.fundraiserName || body.developerName || developer.name).trim();
    const categoryId = String(body.categoryId || "").trim();
    const shortDesc = String(body.shortDesc || "").trim();
    const fullDesc = String(body.fullDesc || "").trim();
    const currency = ["MWK", "USD", "GBP", "EUR"].includes(body.currency) ? body.currency : "MWK";
    const targetAmount = Number(body.targetAmount);
    const thumbnailUrl = body.thumbnailUrl ? String(body.thumbnailUrl) : null;
    const publicMedia: { url: string; publicId?: string; type?: string }[] = Array.isArray(
      body.publicMedia
    )
      ? body.publicMedia
      : [];
    const reviewDocs: { url: string; publicId?: string; type?: string; caption?: string }[] =
      Array.isArray(body.reviewDocs) ? body.reviewDocs : [];

    if (!title || !fundraiserName || !categoryId || !shortDesc || !fullDesc) {
      return NextResponse.json({ error: "Fill in all required fields" }, { status: 400 });
    }
    if (!targetAmount || targetAmount <= 0 || isNaN(targetAmount)) {
      return NextResponse.json({ error: "Enter a valid target amount" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const needsReview = !!category.requiresReview;
    // Medical / Education: require at least one review document
    if (needsReview && reviewDocs.length === 0) {
      return NextResponse.json(
        {
          error:
            "This category requires supporting documents for admin review (bills, school letters, etc.). They stay private.",
        },
        { status: 400 }
      );
    }

    let slug = slugify(title, { lower: true, strict: true });
    const existing = await prisma.project.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const status = needsReview ? "DRAFT" : "ACTIVE";

    const project = await prisma.project.create({
      data: {
        title,
        slug,
        developerName: fundraiserName,
        developerId,
        categoryId,
        shortDesc,
        fullDesc,
        targetAmount,
        currency,
        status: status as any,
        thumbnailUrl,
        reviewRequired: needsReview,
        reviewCompleted: !needsReview,
        reviewedAt: needsReview ? null : new Date(),
      },
    });

    // Public gallery
    let order = 0;
    for (const m of publicMedia) {
      if (!m?.url) continue;
      await prisma.media.create({
        data: {
          projectId: project.id,
          url: m.url,
          publicId: m.publicId || null,
          type: m.type === "VIDEO" ? "VIDEO" : "IMAGE",
          visibility: "PUBLIC",
          sortOrder: order++,
        },
      });
    }

    // Private review-only documents (admin only)
    for (const m of reviewDocs) {
      if (!m?.url) continue;
      await prisma.media.create({
        data: {
          projectId: project.id,
          url: m.url,
          publicId: m.publicId || null,
          type: m.type === "VIDEO" ? "VIDEO" : m.type === "DOCUMENT" ? "DOCUMENT" : "IMAGE",
          visibility: "REVIEW_ONLY",
          caption: m.caption || "Review document",
          sortOrder: order++,
        },
      });
    }

    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    const adminEmail = settings?.contactEmail || process.env.ADMIN_EMAIL || "officialnexus265@gmail.com";

    if (needsReview) {
      await sendEmail(
        adminEmail,
        `Review required: ${title}`,
        `A new ${category.name} campaign needs approval before it goes live.\n\n` +
          `Title: ${title}\nFundraiser: ${fundraiserName}\nEmail: ${developer.email}\n` +
          `Target: ${currency} ${targetAmount}\n\n` +
          `Open Admin → Projects (draft) or Submissions to review documents and Publish.`
      );
      await sendEmail(
        developer.email,
        `Project submitted for review: ${title}`,
        `Hello ${developer.name},\n\n` +
          `Your “${title}” campaign was received. Because it is under ${category.name}, an admin must approve it before donors can see it.\n\n` +
          `Supporting documents are private (admin review only).\n\n` +
          `Inu ndi thandizo lathu`
      );
      if (developer.phone) {
        await sendSMS(
          developer.phone,
          `Thandizo: “${title}” submitted for admin review (${category.name}). You will be notified when it goes live.`
        );
      }
    } else {
      await sendEmail(
        developer.email,
        `Your project is live: ${title}`,
        `Hello ${developer.name},\n\n` +
          `Good news — “${title}” is live on Thandizo. Donors can support it now.\n\n` +
          `Manage it in the fundraiser portal.\n\nInu ndi thandizo lathu`
      );
      if (developer.phone) {
        await sendSMS(developer.phone, `Thandizo: “${title}” is live. Share it with supporters.`);
      }
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      slug: project.slug,
      status: project.status,
      needsReview,
      message: needsReview
        ? "Submitted for admin review. It will go live after approval."
        : "Your project is live.",
    });
  } catch (err: any) {
    console.error("developer submit", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
