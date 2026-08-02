import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Set(["page_view", "ad_view", "ad_click", "custom"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = String(body.type || "page_view");
    if (!ALLOWED.has(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const path = body.path ? String(body.path).slice(0, 500) : null;
    // Skip noisy admin tracking noise optionally — still allow if sent
    const label = body.label ? String(body.label).slice(0, 200) : null;
    const referrer = body.referrer ? String(body.referrer).slice(0, 500) : null;
    const sessionId = body.sessionId ? String(body.sessionId).slice(0, 64) : null;
    const meta = body.meta && typeof body.meta === "object" ? body.meta : undefined;

    await prisma.analyticsEvent.create({
      data: {
        type,
        path,
        label,
        referrer,
        sessionId,
        meta: meta ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("analytics track error", err);
    // Don't fail the client UX
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
