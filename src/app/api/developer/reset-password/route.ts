import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateAccessCode, hashAccessCode } from "@/lib/developer";
import { sendEmail, sendSMS } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const step = String(body.step || "start");
    const email = String(body.email || "").trim().toLowerCase();

    if (step === "start") {
      const d = await prisma.developer.findUnique({ where: { email } });
      if (!d || d.bannedAt) {
        // Do not reveal whether account exists
        return NextResponse.json({
          success: true,
          hasQuestion: false,
          message: "If the account exists, continue with your security answer.",
        });
      }
      return NextResponse.json({
        success: true,
        hasQuestion: !!d.securityQuestion,
        securityQuestion: d.securityQuestion || null,
      });
    }

    if (step === "reset") {
      const answer = String(body.securityAnswer || "").trim().toLowerCase();
      const newPassword = String(body.newPassword || "");
      const d = await prisma.developer.findUnique({ where: { email } });
      if (!d || d.bannedAt || !d.securityAnswerHash) {
        return NextResponse.json({ error: "Unable to reset" }, { status: 400 });
      }
      const ok = await bcrypt.compare(answer, d.securityAnswerHash);
      if (!ok) return NextResponse.json({ error: "Security answer incorrect" }, { status: 400 });
      if (newPassword.length < 8) {
        return NextResponse.json({ error: "Password min 8 characters" }, { status: 400 });
      }

      const accessCode = generateAccessCode();
      await prisma.developer.update({
        where: { id: d.id },
        data: {
          passwordHash: await bcrypt.hash(newPassword, 10),
          accessCodeHash: await hashAccessCode(accessCode),
        },
      });

      await sendEmail(
        d.email,
        "Thandizo password reset",
        `Hello ${d.name},\n\nYour password was reset. New portal access code: ${accessCode}\n\nIf this was not you, contact support.\n\nInu ndi thandizo lathu`
      );
      if (d.phone) {
        await sendSMS(d.phone, `Thandizo: password reset OK. New access code ${accessCode}`);
      }

      return NextResponse.json({
        success: true,
        accessCode,
        message: "Password updated. New access code sent by email/SMS.",
      });
    }

    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
