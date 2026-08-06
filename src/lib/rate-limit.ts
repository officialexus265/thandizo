type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window rate limit (per server instance / lambda isolate).
 * On Vercel, each isolate has its own map — still slows bulk attacks.
 */
export function hitRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true };
}

/** Peek without incrementing */
export function checkRateLimit(
  key: string,
  limit: number
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) return { ok: true };
  if (b.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true };
}

export function recordRateLimitHit(key: string, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count += 1;
}

export function limitByIp(ip: string, action: string, limit: number, windowMs: number) {
  return hitRateLimit(`ip:${action}:${ip || "unknown"}`, limit, windowMs);
}

export async function delayMs(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
