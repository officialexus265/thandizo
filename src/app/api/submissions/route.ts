import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const categoryId = body.categoryId ? String(body.categoryId) : null;
    const developerName = String(body.developerName || "").trim();
    const developerEmail = String(body.developerEmail || "").trim();
    const developerPhone = body.developerPhone
      ? String(body.developerPhone).trim()
      : null;
    const shortDesc = String(body.shortDesc || "").trim();
    const fullDesc = String(body.fullDesc || "").trim();
    const currency = ["MWK", "USD", "GBP", "EUR"].includes(body.currency)
      ? body.currency
      : "MWK";
    const targetAmount = Number(body.targetAmount);

    if (!title || !developerName || !developerEmail || !shortDesc || !fullDesc || !categoryId) {
      return NextResponse.json(
        { error: "Please fill in all required fields." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(developerEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (!targetAmount || targetAmount <= 0 || isNaN(targetAmount)) {
      return NextResponse.json(
        { error: "Enter a valid target amount." },
        { status: 400 }
      );
    }

    const submission = await prisma.projectSubmission.create({
      data: {
        title,
        categoryId,
        developerName,
        developerEmail,
        developerPhone,
        shortDesc,
        fullDesc,
        targetAmount,
        currency,
        status: "PENDING",
      },
    });

    // Notify admin (best-effort)
    try {
      const { sendEmail } = await import("@/lib/notifications");
      const adminEmail =
        process.env.ADMIN_EMAIL ||
        (
          await prisma.siteSettings.findUnique({ where: { id: "default" } })
        )?.contactEmail ||
        "officialnexus265@gmail.com";
      await sendEmail(
        adminEmail,
        `New project submission: ${title}`,
        `A developer submitted a project for review.\n\n` +
          `Title: ${title}\n` +
          `Developer: ${developerName}\n` +
          `Email: ${developerEmail}\n` +
          `Phone: ${developerPhone || "—"}\n` +
          `Target: ${currency} ${targetAmount}\n\n` +
          `Short description:\n${shortDesc}\n\n` +
          `Review in admin: /admin/submissions`
      );
    } catch (e) {
      console.error("Admin notify on submission failed", e);
    }

    return NextResponse.json({ success: true, id: submission.id });
  } catch (err: any) {
    console.error("submission create", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
