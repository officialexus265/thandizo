import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initiatePayChanguPayment } from "@/lib/paychangu";
import { expireStalePendingDonations } from "@/lib/donations";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    // Opportunistically clean up old abandoned checkouts on every new attempt
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
    } = body;

    if (!projectId || !amount || amount <= 0 || !currency) {
      return NextResponse.json({ error: "Invalid donation data" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.status !== "ACTIVE") {
      return NextResponse.json({ error: "Project not available for funding" }, { status: 400 });
    }

    const txRef = `mth-${uuidv4().slice(0, 8)}-${Date.now().toString(36)}`;

    const donation = await prisma.donation.create({
      data: {
        projectId,
        amount,
        currency,
        donorName: isAnonymous ? null : donorName || null,
        isAnonymous: !!isAnonymous,
        email: email || null,
        phone: phone || null,
        preferredContact: preferredContact || "NONE",
        message: message || null,
        txRef,
        status: "PENDING",
      },
    });

    const baseUrl = (process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/+$/, "");

    const { checkoutUrl } = await initiatePayChanguPayment({
      amount: Number(amount),
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
      },
    });

    return NextResponse.json({ checkoutUrl, txRef });
  } catch (err: any) {
    console.error("Initiate donation error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
