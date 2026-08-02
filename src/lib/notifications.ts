import { prisma } from "./prisma";

const SIGNATURE = "Inu ndi thandizo lathu";

/** Malawi / international phone → E.164-ish +digits */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    digits = "265" + digits.slice(1);
  }
  if (!digits.startsWith("265") && digits.length === 9) {
    digits = "265" + digits;
  }
  return "+" + digits;
}

export async function sendSMS(to: string, message: string) {
  const apiKey = process.env.HTTPSMS_API_KEY;
  // Must be the E.164 number of the phone running the httpSMS Android app
  const from = process.env.HTTPSMS_FROM || "";

  if (!apiKey) {
    console.warn("HTTPSMS_API_KEY not set – SMS skipped");
    await prisma.notificationLog.create({
      data: {
        type: "sms",
        recipient: to,
        message,
        status: "skipped_no_key",
      },
    });
    return { success: false, error: "SMS not configured (HTTPSMS_API_KEY)" };
  }

  if (!from || from.toLowerCase() === "thandizo") {
    console.warn(
      "HTTPSMS_FROM must be the E.164 phone number of your httpSMS Android device (e.g. +26599...)"
    );
    await prisma.notificationLog.create({
      data: {
        type: "sms",
        recipient: to,
        message,
        status: "skipped_bad_from",
      },
    });
    return {
      success: false,
      error: "HTTPSMS_FROM must be your phone number in +265… format, not a name",
    };
  }

  const toNorm = normalizePhone(to);
  const fromNorm = from.startsWith("+") ? from : normalizePhone(from);
  const content = `${message}\n\n${SIGNATURE}`.slice(0, 600);

  try {
    const res = await fetch("https://api.httpsms.com/v1/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        content,
        from: fromNorm,
        to: toNorm,
      }),
    });

    const data = await res.json().catch(() => ({}));
    const success = res.ok;

    if (!success) {
      console.error("httpSMS error", res.status, JSON.stringify(data));
    }

    await prisma.notificationLog.create({
      data: {
        type: "sms",
        recipient: toNorm,
        message: content,
        status: success ? "sent" : `failed:${res.status}:${JSON.stringify(data).slice(0, 200)}`,
      },
    });

    return { success, data, status: res.status };
  } catch (err: any) {
    console.error("httpSMS exception", err);
    await prisma.notificationLog.create({
      data: {
        type: "sms",
        recipient: to,
        message,
        status: "failed:" + (err.message || "exception"),
      },
    });
    return { success: false, error: err.message };
  }
}

export async function sendEmail(to: string, subject: string, body: string) {
  const resendKey = process.env.RESEND_API_KEY;
  // Resend requires a verified domain OR use onboarding@resend.dev for tests
  const fromAddress =
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "Thandizo <onboarding@resend.dev>";

  const fullBody = `${body}\n\n${SIGNATURE}`;

  if (!resendKey) {
    console.warn("RESEND_API_KEY not set – email logged only (not delivered)");
    await prisma.notificationLog.create({
      data: {
        type: "email",
        recipient: to,
        message: `[NOT SENT — no RESEND_API_KEY]\nSubject: ${subject}\n\n${fullBody}`,
        status: "logged_no_key",
      },
    });
    return {
      success: false,
      logged: true,
      error: "RESEND_API_KEY missing — set it in Vercel env to send real emails",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        text: fullBody,
      }),
    });

    const data = await res.json().catch(() => ({}));
    const success = res.ok;

    if (!success) {
      console.error("Resend error", res.status, JSON.stringify(data));
    }

    await prisma.notificationLog.create({
      data: {
        type: "email",
        recipient: to,
        message: `Subject: ${subject}\n\n${fullBody}`,
        status: success
          ? "sent"
          : `failed:${res.status}:${JSON.stringify(data).slice(0, 300)}`,
      },
    });

    return { success, data };
  } catch (err: any) {
    console.error("Resend exception", err);
    await prisma.notificationLog.create({
      data: {
        type: "email",
        recipient: to,
        message: fullBody,
        status: "failed:" + (err.message || "exception"),
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
