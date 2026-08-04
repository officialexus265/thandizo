import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail, sendSMS } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role === "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const channel = String(body.channel || "email").toLowerCase();
    const to = String(body.to || "").trim();

    if (!to) {
      return NextResponse.json({ error: "Enter a test email or phone number" }, { status: 400 });
    }

    if (channel === "email") {
      const result = await sendEmail(
        to,
        "Thandizo test email",
        "This is a test email from your Thandizo admin panel. If you received this, Resend is working.\n\nInu ndi thandizo lathu"
      );
      return NextResponse.json({ channel: "email", to, result });
    }

    if (channel === "sms") {
      const result = await sendSMS(
        to,
        "Thandizo test SMS. If you got this, httpSMS is working."
      );
      return NextResponse.json({ channel: "sms", to, result });
    }

    return NextResponse.json({ error: "channel must be email or sms" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
