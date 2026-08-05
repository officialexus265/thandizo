import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "developer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = (session.user as any).id as string;
  const body = await req.json();

  try {
    const data: any = {};
    if (body.password) {
      if (String(body.password).length < 8) {
        return NextResponse.json({ error: "Password min 8 characters" }, { status: 400 });
      }
      data.passwordHash = await bcrypt.hash(String(body.password), 10);
    }
    if (body.securityQuestion && body.securityAnswer) {
      data.securityQuestion = String(body.securityQuestion).trim();
      data.securityAnswerHash = await bcrypt.hash(
        String(body.securityAnswer).trim().toLowerCase(),
        10
      );
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    await prisma.developer.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
