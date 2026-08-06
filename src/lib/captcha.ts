/**
 * Cloudflare Turnstile verification.
 * If TURNSTILE_SECRET_KEY is not set, verification is skipped (local/dev).
 */
export async function verifyCaptcha(
  token: string | undefined | null,
  ip?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Not configured — allow (document that production should set keys)
    return { ok: true };
  }
  if (!token || typeof token !== "string" || token.length < 10) {
    return { ok: false, error: "Please complete the CAPTCHA" };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (ip) body.set("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      return { ok: false, error: "CAPTCHA failed. Please try again." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "CAPTCHA verification unavailable. Try again." };
  }
}

export function getClientIp(req: Request): string {
  const h = req.headers;
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "unknown";
}
