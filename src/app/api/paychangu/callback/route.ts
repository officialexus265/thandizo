import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPayChanguTransaction } from "@/lib/paychangu";
import { sendThankYou } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const txRef = searchParams.get("tx_ref") || searchParams.get("txRef");
  const status = searchParams.get("status");

  if (!txRef) {
    return NextResponse.redirect(new URL("/?error=missing_ref", req.url));
  }

  try {
    // Always verify server-side
    const verification = await verifyPayChanguTransaction(txRef);
    const isSuccess =
      verification?.status === "success" ||
      verification?.data?.status === "success" ||
      verification?.data?.status === "successful";

    const donation = await prisma.donation.findUnique({
      where: { txRef },
      include: { project: true },
    });

    if (!donation) {
      return NextResponse.redirect(new URL("/?error=donation_not_found", req.url));
    }

    if (isSuccess && donation.status !== "SUCCESS") {
      // Update donation
      await prisma.donation.update({
        where: { id: donation.id },
        data: {
          status: "SUCCESS",
          paychanguRef: verification?.data?.id || verification?.data?.transaction_id || null,
        },
      });

      // Update project totals
      await prisma.project.update({
        where: { id: donation.projectId },
        data: {
          raisedAmount: { increment: donation.amount },
          donorCount: { increment: 1 },
        },
      });

      // Send thank-you
      await sendThankYou({
        donorName: donation.donorName,
        isAnonymous: donation.isAnonymous,
        amount: Number(donation.amount),
        currency: donation.currency,
        projectTitle: donation.project.title,
        email: donation.email,
        phone: donation.phone,
        preferredContact: donation.preferredContact as any,
      });
    } else if (!isSuccess && donation.status === "PENDING") {
      await prisma.donation.update({
        where: { id: donation.id },
        data: { status: "FAILED" },
      });
    }

    const redirectUrl = `/project/${donation.project.slug}?payment=${isSuccess ? "success" : "failed"}`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  } catch (err) {
    console.error("PayChangu callback error:", err);
    return NextResponse.redirect(new URL("/?error=verification_failed", req.url));
  }
}
