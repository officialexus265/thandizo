import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateAccessCode, hashAccessCode } from "@/lib/developer";
import { sendSecurityAlert, sendEmail, sendSMS } from "@/lib/notifications";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const d = await prisma.developer.findUnique({
    where: { id: (session.user as any).id },
  });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    hasPassword: !!d.passwordHash,
    securityQuestion: d.securityQuestion,
    hasSecurityQuestion: !!d.securityQuestion,
    email: d.email,
    phone: d.phone,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = (session.user as any).id as string;
  const body = await req.json();
  const action = String(body.action || "update");

  try {
    const d = await prisma.developer.findUnique({ where: { id } });
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (d.bannedAt) {
      return NextResponse.json({ error: "Account banned" }, { status: 403 });
    }

    // Regenerate portal access code (requires current password or security answer)
    if (action === "regenerate-access-code") {
      const password = body.password ? String(body.password) : "";
      const answer = body.securityAnswer
        ? String(body.securityAnswer).trim().toLowerCase()
        : "";

      let authorized = false;
      if (password && d.passwordHash) {
        authorized = await bcrypt.compare(password, d.passwordHash);
      }
      if (!authorized && answer && d.securityAnswerHash) {
        authorized = await bcrypt.compare(answer, d.securityAnswerHash);
      }
      if (!authorized) {
        return NextResponse.json(
          { error: "Confirm with password or security answer" },
          { status: 400 }
        );
      }

      const accessCode = generateAccessCode();
      await prisma.developer.update({
        where: { id },
        data: { accessCodeHash: await hashAccessCode(accessCode) },
      });

      await sendSecurityAlert({
        email: d.email,
        phone: d.phone,
        name: d.name,
        event: "Portal access code changed",
        detail: "A new access code was generated for your fundraiser portal login.",
      });
      // Send the new code separately (not only "alert")
      await sendEmail(
        d.email,
        "Your new Thandizo access code",
        `Hello ${d.name},\n\nYour new portal access code is:\n\n${accessCode}\n\nKeep it private.\n\nInu ndi thandizo lathu`
      );
      if (d.phone) {
        await sendSMS(d.phone, `Thandizo: new access code ${accessCode}`);
      }

      return NextResponse.json({ success: true, accessCode });
    }

    // Default: update password and/or security question
    const data: any = {};
    const events: string[] = [];

    if (body.password) {
      if (String(body.password).length < 8) {
        return NextResponse.json({ error: "Password min 8 characters" }, { status: 400 });
      }
      data.passwordHash = await bcrypt.hash(String(body.password), 10);
      events.push("Password changed");
    }
    if (body.securityQuestion && body.securityAnswer) {
      data.securityQuestion = String(body.securityQuestion).trim();
      data.securityAnswerHash = await bcrypt.hash(
        String(body.securityAnswer).trim().toLowerCase(),
        10
      );
      events.push("Security question updated");
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await prisma.developer.update({ where: { id }, data });

    for (const event of events) {
      await sendSecurityAlert({
        email: d.email,
        phone: d.phone,
        name: d.name,
        event,
        detail:
          event === "Password changed"
            ? "Your fundraiser account password was changed from the Security page."
            : "Your account recovery security question was updated.",
      });
    }

    return NextResponse.json({ success: true, events });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
