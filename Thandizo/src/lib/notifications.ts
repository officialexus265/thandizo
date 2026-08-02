import { prisma } from "./prisma";

const SIGNATURE = "Inu ndi thandizo lathu";

export async function sendSMS(to: string, message: string) {
  const apiKey = process.env.HTTPSMS_API_KEY;
  const from = process.env.HTTPSMS_FROM || "Thandizo";

  if (!apiKey) {
    console.warn("HTTPSMS_API_KEY not set – SMS skipped");
    return { success: false, error: "SMS not configured" };
  }

  // httpsms.com API – adjust endpoint if their docs differ
  try {
    const res = await fetch("https://api.httpsms.com/v1/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        content: `${message}\n\n${SIGNATURE}`,
        from,
        to: to.startsWith("+") ? to : `+${to.replace(/\D/g, "")}`,
      }),
    });

    const data = await res.json();
    const success = res.ok;

    await prisma.notificationLog.create({
      data: {
        type: "sms",
        recipient: to,
        message: `${message}\n\n${SIGNATURE}`,
        status: success ? "sent" : "failed",
      },
    });

    return { success, data };
  } catch (err: any) {
    await prisma.notificationLog.create({
      data: {
        type: "sms",
        recipient: to,
        message,
        status: "failed",
      },
    });
    return { success: false, error: err.message };
  }
}

export async function sendEmail(to: string, subject: string, body: string) {
  // Using Resend if available, otherwise log for now
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_EMAIL || "officialnexus265@gmail.com";

  const fullBody = `${body}\n\n${SIGNATURE}`;

  if (!resendKey) {
    console.warn("RESEND_API_KEY not set – email logged only");
    await prisma.notificationLog.create({
      data: {
        type: "email",
        recipient: to,
        message: fullBody,
        status: "logged",
      },
    });
    return { success: true, logged: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Thandizo <${from}>`,
        to: [to],
        subject,
        text: fullBody,
      }),
    });

    const success = res.ok;
    await prisma.notificationLog.create({
      data: {
        type: "email",
        recipient: to,
        message: fullBody,
        status: success ? "sent" : "failed",
      },
    });

    return { success };
  } catch (err: any) {
    await prisma.notificationLog.create({
      data: {
        type: "email",
        recipient: to,
        message: fullBody,
        status: "failed",
      },
    });
    return { success: false, error: err.message };
  }
}

export async function sendThankYou(donation: {
  donorName: string | null;
  isAnonymous: boolean;
  amount: number | string;
  currency: string;
  projectTitle: string;
  email?: string | null;
  phone?: string | null;
  preferredContact: "NONE" | "EMAIL" | "SMS" | "BOTH";
}) {
  const name = donation.isAnonymous || !donation.donorName ? "Friend" : donation.donorName;
  const amountStr = `${donation.currency} ${Number(donation.amount).toLocaleString()}`;
  const message = `Thank you ${name}! Your donation of ${amountStr} towards the ${donation.projectTitle} project has been received.`;

  const results: any = {};

  if (
    (donation.preferredContact === "EMAIL" || donation.preferredContact === "BOTH") &&
    donation.email
  ) {
    results.email = await sendEmail(
      donation.email,
      `Thank you for supporting ${donation.projectTitle}`,
      message
    );
  }

  if (
    (donation.preferredContact === "SMS" || donation.preferredContact === "BOTH") &&
    donation.phone
  ) {
    results.sms = await sendSMS(donation.phone, message);
  }

  return results;
}
