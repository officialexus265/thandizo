import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendSMS } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, message, projectId } = body;

    if (!name || (!email && !phone)) {
      return NextResponse.json(
        { error: "Name and at least one contact method (email or phone) are required" },
        { status: 400 }
      );
    }

    const interest = await prisma.partnerInterest.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        message: message || null,
        projectId: projectId || null,
        status: "NEW",
      },
      include: {
        project: { select: { title: true } },
      },
    });

    // Notify admin
    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    const adminEmail = settings?.contactEmail || process.env.ADMIN_EMAIL || "officialnexus265@gmail.com";

    const projectLine = interest.project
      ? `Project: ${interest.project.title}`
      : "General partnership interest";

    const notifyMsg = `New partner interest from ${name}.\n${projectLine}\nEmail: ${email || "—"}\nPhone: ${phone || "—"}\nMessage: ${message || "—"}`;

    // Fire and forget
    sendEmail(adminEmail, "New Partner Interest – Thandizo", notifyMsg).catch(console.error);

    return NextResponse.json({ success: true, id: interest.id });
  } catch (err: any) {
    console.error("Partner interest error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
