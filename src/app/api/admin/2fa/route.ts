import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authenticator } from "otplib";
import QRCode from "qrcode";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await prisma.admin.findUnique({
    where: { email: session.user.email },
  });

  if (!admin) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  return NextResponse.json({
    twoFactorEnabled: admin.twoFactorEnabled,
    hasSecret: !!admin.twoFactorSecret,
  });
}

// Generate a new secret + QR code (does not enable 2FA yet)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action; // "generate" | "enable" | "disable"

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    if (action === "generate") {
      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(
        admin.email,
        "Thandizo Admin",
        secret
      );
      const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

      // Save secret temporarily (not enabled yet)
      await prisma.admin.update({
        where: { id: admin.id },
        data: { twoFactorSecret: secret },
      });

      return NextResponse.json({
        secret,
        qrCode: qrCodeDataUrl,
      });
    }

    if (action === "enable") {
      const { token } = body;
      if (!token || !admin.twoFactorSecret) {
        return NextResponse.json(
          { error: "Token and secret required" },
          { status: 400 }
        );
      }

      const isValid = authenticator.verify({
        token,
        secret: admin.twoFactorSecret,
      });

      if (!isValid) {
        return NextResponse.json({ error: "Invalid code" }, { status: 400 });
      }

      await prisma.admin.update({
        where: { id: admin.id },
        data: { twoFactorEnabled: true },
      });

      return NextResponse.json({ success: true, twoFactorEnabled: true });
    }

    if (action === "disable") {
      const { token } = body;

      // Require current 2FA token to disable
      if (admin.twoFactorEnabled) {
        if (!token || !admin.twoFactorSecret) {
          return NextResponse.json(
            { error: "Current 2FA code required to disable" },
            { status: 400 }
          );
        }
        const isValid = authenticator.verify({
          token,
          secret: admin.twoFactorSecret,
        });
        if (!isValid) {
          return NextResponse.json({ error: "Invalid code" }, { status: 400 });
        }
      }

      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      });

      return NextResponse.json({ success: true, twoFactorEnabled: false });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("2FA error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
