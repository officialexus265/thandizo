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
  const fullBody = `${body}\n\n${SIGNATURE}`;
  const fromAddress =
    process.env.EMAIL_FROM ||
    (process.env.SMTP_USER ? `Thandizo <${process.env.SMTP_USER}>` : null) ||
    process.env.RESEND_FROM ||
    "Thandizo <onboarding@resend.dev>";

  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 465);

  // Prefer Gmail / generic SMTP when configured (works without your own domain)
  if (smtpUser && smtpPass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: fullBody,
      });

      await prisma.notificationLog.create({
        data: {
          type: "email",
          recipient: to,
          message: `Subject: ${subject}\n\n${fullBody}`,
          status: "sent:smtp:" + (info.messageId || "ok"),
        },
      });

      return { success: true, provider: "smtp", data: { messageId: info.messageId } };
    } catch (err: any) {
      console.error("SMTP email error", err);
      await prisma.notificationLog.create({
        data: {
          type: "email",
          recipient: to,
          message: fullBody,
          status: "failed:smtp:" + (err.message || "exception").slice(0, 250),
        },
      });
      return { success: false, provider: "smtp", error: err.message };
    }
  }

  // Fallback: Resend (needs domain or only sends to your Resend account email)
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("No SMTP_USER/SMTP_PASS and no RESEND_API_KEY – email not sent");
    await prisma.notificationLog.create({
      data: {
        type: "email",
        recipient: to,
        message: `[NOT SENT — configure Gmail SMTP or Resend]\nSubject: ${subject}\n\n${fullBody}`,
        status: "logged_no_key",
      },
    });
    return {
      success: false,
      logged: true,
      error:
        "Email not configured. Set SMTP_USER + SMTP_PASS (Gmail App Password) on Vercel, or RESEND_API_KEY.",
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
          ? "sent:resend"
          : `failed:resend:${res.status}:${JSON.stringify(data).slice(0, 250)}`,
      },
    });

    return { success, provider: "resend", data };
  } catch (err: any) {
    console.error("Resend exception", err);
    await prisma.notificationLog.create({
      data: {
        type: "email",
        recipient: to,
        message: fullBody,
        status: "failed:resend:" + (err.message || "exception"),
      },
    });
    return { success: false, provider: "resend", error: err.message };
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

/** Email + SMS when password / access code / security settings change */
export async function sendSecurityAlert(params: {
  email: string;
  phone?: string | null;
  name: string;
  event: string;
  detail?: string;
}) {
  const body =
    "Hello " +
    params.name +
    ",\n\nSecurity alert: " +
    params.event +
    "\n\n" +
    (params.detail ? params.detail + "\n\n" : "") +
    "If this was not you, reset your password using your security question and contact support immediately.\n\n" +
    "Inu ndi thandizo lathu";

  await sendEmail(params.email, "Thandizo security alert: " + params.event, body);
  if (params.phone) {
    await sendSMS(
      params.phone,
      "Thandizo security: " +
        params.event +
        ". If this was not you, reset password and contact support."
    );
  }
}
