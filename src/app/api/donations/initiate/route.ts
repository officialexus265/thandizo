import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initiatePayChanguPayment } from "@/lib/paychangu";
import { expireStalePendingDonations } from "@/lib/donations";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    await expireStalePendingDonations();

    const body = await req.json();
    const {
      projectId,
      amount,
      currency,
      donorName,
      isAnonymous,
      email,
      phone,
      preferredContact,
      message,
      acceptedRisk,
    } = body;

    if (!projectId || !amount || amount <= 0 || !currency) {
      return NextResponse.json({ error: "Invalid donation data" }, { status: 400 });
    }

    if (!acceptedRisk) {
      return NextResponse.json(
        { error: "You must accept the donor risk notice before donating" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { category: true },
    });
    if (!project || project.status !== "ACTIVE") {
      return NextResponse.json({ error: "Project not available for funding" }, { status: 400 });
    }

    const gross = Number(amount);
    const feePercent = project.category?.feePercent ?? 0;
    const platformFeeAmount = Math.round((gross * feePercent) / 100 * 100) / 100;
    const netAmount = Math.round((gross - platformFeeAmount) * 100) / 100;

    const txRef = `thz-${uuidv4().slice(0, 8)}-${Date.now().toString(36)}`;

    const donation = await prisma.donation.create({
      data: {
        projectId,
        amount: gross,
        currency,
        donorName: isAnonymous ? null : donorName || null,
        isAnonymous: !!isAnonymous,
        email: email || null,
        phone: phone || null,
        preferredContact: preferredContact || "NONE",
        fundMode: "DIRECT",
        message: message || null,
        txRef,
        status: "PENDING",
        platformFeePercent: feePercent,
        platformFeeAmount,
        netAmount,
      },
    });

    const baseUrl = (
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    ).replace(/\/+$/, "");

    const { checkoutUrl } = await initiatePayChanguPayment({
      amount: gross,
      currency,
      email: email || undefined,
      firstName: donorName?.split(" ")[0] || undefined,
      lastName: donorName?.split(" ").slice(1).join(" ") || undefined,
      txRef,
      callbackUrl: `${baseUrl}/api/paychangu/callback`,
      returnUrl: `${baseUrl}/project/${project.slug}?payment=cancelled`,
      title: `Donation to ${project.title}`,
      description: `Support for ${project.title} via thandizo`,
      meta: {
        donationId: donation.id,
        projectId: project.id,
        feePercent: String(feePercent),
      },
    });

    return NextResponse.json({
      checkoutUrl,
      txRef,
      feePercent,
      platformFeeAmount,
      netAmount,
    });
  } catch (err: any) {
    console.error("Initiate donation error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
