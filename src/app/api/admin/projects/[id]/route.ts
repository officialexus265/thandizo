import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";
import { computeReviewRequired } from "@/lib/review";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { media: { orderBy: { sortOrder: "asc" } } },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      title,
      developerName,
      shortDesc,
      fullDesc,
      targetAmount,
      currency,
      status,
      categoryId,
      isPinned,
      thumbnailUrl,
      pinOrder,
    } = body;

    const data: any = {};
    if (title !== undefined) {
      data.title = title;
      data.slug = slugify(title, { lower: true, strict: true });
    }
    if (developerName !== undefined) data.developerName = developerName || null;
    if (shortDesc !== undefined) data.shortDesc = shortDesc;
    if (fullDesc !== undefined) data.fullDesc = fullDesc;
    if (targetAmount !== undefined) data.targetAmount = targetAmount;
    if (currency !== undefined) data.currency = currency;
    if (status !== undefined) data.status = status;
    if (categoryId !== undefined) data.categoryId = categoryId || null;
    if (isPinned !== undefined) data.isPinned = isPinned;
    if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl;
    if (pinOrder !== undefined) data.pinOrder = pinOrder;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (existing) {
      const catId = categoryId !== undefined ? categoryId : existing.categoryId;
      const tgt = data.targetAmount !== undefined ? data.targetAmount : existing.targetAmount;
      data.reviewRequired = await computeReviewRequired({
        categoryId: catId,
        targetAmount: tgt,
      });
      if (data.reviewRequired && (categoryId !== undefined || data.targetAmount !== undefined)) {
        data.reviewCompleted = false;
        data.reviewedAt = null;
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data,
    });

    return NextResponse.json(project);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}


/** Publish a draft (or re-activate) after the developer call / checklist */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "publish";

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "publish") {
      if (project.status !== "DRAFT" && project.status !== "CLOSED") {
        return NextResponse.json(
          { error: `Cannot publish from status ${project.status}` },
          { status: 400 }
        );
      }

      // KYC must be approved when a fundraiser account is linked
      if (project.developerId) {
        const owner = await prisma.developer.findUnique({
          where: { id: project.developerId },
        });
        if (!owner || owner.kycStatus !== "APPROVED") {
          return NextResponse.json(
            {
              error:
                "Cannot publish: fundraiser KYC is not approved. Complete ID, selfie-with-ID, and verification video review first.",
            },
            { status: 400 }
          );
        }
      }

      // Recompute whether human review is required
      const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
      const threshold = settings?.largeTargetThreshold ?? 500000;
      let needsReview = project.reviewRequired;
      if (project.categoryId) {
        const cat = await prisma.category.findUnique({ where: { id: project.categoryId } });
        if (cat?.requiresReview) needsReview = true;
      }
      if (Number(project.targetAmount) >= Number(threshold)) needsReview = true;

      if (needsReview && !project.reviewCompleted) {
        return NextResponse.json(
          {
            error:
              "Cannot publish: human review is required for this campaign (medical / large appeal / large target). Mark review as completed first.",
          },
          { status: 400 }
        );
      }

      const updated = await prisma.project.update({
        where: { id },
        data: {
          status: "ACTIVE",
          reviewRequired: needsReview,
        },
      });
      return NextResponse.json({ success: true, project: updated });
    }

    if (action === "complete-review") {
      const updated = await prisma.project.update({
        where: { id },
        data: {
          reviewRequired: true,
          reviewCompleted: true,
          reviewedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, project: updated });
    }

    if (action === "unpublish") {
      const updated = await prisma.project.update({
        where: { id },
        data: { status: "DRAFT", isPinned: false },
      });
      return NextResponse.json({ success: true, project: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
