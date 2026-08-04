import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPayChanguTransaction } from "@/lib/paychangu";
import { sendThankYou } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const txRef = searchParams.get("tx_ref") || searchParams.get("txRef");

  if (!txRef) {
    return NextResponse.redirect(new URL("/?error=missing_ref", req.url));
  }

  try {
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
      await prisma.donation.update({
        where: { id: donation.id },
        data: {
          status: "SUCCESS",
          fundMode: "DIRECT",
          paychanguRef:
            verification?.data?.id || verification?.data?.transaction_id || null,
        },
      });

      const updatedProject = await prisma.project.update({
        where: { id: donation.projectId },
        data: {
          raisedAmount: { increment: donation.amount },
          donorCount: { increment: 1 },
        },
      });

      // Auto-mark FUNDED when target reached (still ACTIVE for display until admin closes if preferred)
      if (
        updatedProject.status === "ACTIVE" &&
        Number(updatedProject.raisedAmount) >= Number(updatedProject.targetAmount)
      ) {
        await prisma.project.update({
          where: { id: donation.projectId },
          data: { status: "FUNDED" },
        });
      }

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

    const redirectUrl = `/project/${donation.project.slug}?payment=${
      isSuccess ? "success" : "failed"
    }`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  } catch (err) {
    console.error("PayChangu callback error:", err);
    return NextResponse.redirect(new URL("/?error=verification_failed", req.url));
  }
}
