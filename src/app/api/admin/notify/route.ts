import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendSMS } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { message, channels, projectId, onlyWithContact } = body;
    // channels: ["EMAIL"] | ["SMS"] | ["EMAIL","SMS"]

    if (!message || !channels || channels.length === 0) {
      return NextResponse.json({ error: "Message and at least one channel required" }, { status: 400 });
    }

    const where: any = {
      status: "SUCCESS",
      preferredContact: { not: "NONE" },
    };
    if (projectId) where.projectId = projectId;

    const donations = await prisma.donation.findMany({
      where,
      select: {
        id: true,
        donorName: true,
        email: true,
        phone: true,
        preferredContact: true,
      },
    });

    // Deduplicate by email/phone so we don't spam the same person
    const seenEmail = new Set<string>();
    const seenPhone = new Set<string>();
    const recipients: { email?: string; phone?: string; name: string; pref: string }[] = [];

    for (const d of donations) {
      const name = d.donorName || "Friend";
      let added = false;

      if (
        (channels.includes("EMAIL") || channels.includes("BOTH")) &&
        d.email &&
        (d.preferredContact === "EMAIL" || d.preferredContact === "BOTH") &&
        !seenEmail.has(d.email)
      ) {
        seenEmail.add(d.email);
        recipients.push({ email: d.email, name, pref: d.preferredContact });
        added = true;
      }

      if (
        (channels.includes("SMS") || channels.includes("BOTH")) &&
        d.phone &&
        (d.preferredContact === "SMS" || d.preferredContact === "BOTH") &&
        !seenPhone.has(d.phone)
      ) {
        if (!added) {
          recipients.push({ phone: d.phone, name, pref: d.preferredContact });
        } else {
          // already added via email – attach phone if needed
          const last = recipients[recipients.length - 1];
          if (!last.phone) last.phone = d.phone;
        }
        seenPhone.add(d.phone);
      }
    }

    let sent = 0;
    let failed = 0;

    for (const r of recipients) {
      try {
        if (r.email && (channels.includes("EMAIL") || channels.includes("BOTH"))) {
          const personalized = message.replace(/\{name\}/gi, r.name);
          await sendEmail(r.email, "Message from Thandizo", personalized);
          sent++;
        }
        if (r.phone && (channels.includes("SMS") || channels.includes("BOTH"))) {
          const personalized = message.replace(/\{name\}/gi, r.name);
          await sendSMS(r.phone, personalized);
          sent++;
        }
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      recipients: recipients.length,
      sent,
      failed,
    });
  } catch (err: any) {
    console.error("Notify error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

// GET – list possible recipients summary
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const where: any = { status: "SUCCESS", preferredContact: { not: "NONE" } };
  if (projectId) where.projectId = projectId;

  const donations = await prisma.donation.findMany({
    where,
    select: {
      email: true,
      phone: true,
      preferredContact: true,
      project: { select: { title: true } },
    },
  });

  const withEmail = donations.filter((d) => d.email && (d.preferredContact === "EMAIL" || d.preferredContact === "BOTH")).length;
  const withSms = donations.filter((d) => d.phone && (d.preferredContact === "SMS" || d.preferredContact === "BOTH")).length;

  return NextResponse.json({
    total: donations.length,
    withEmail,
    withSms,
  });
}
