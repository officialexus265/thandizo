type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window rate limit (per server instance / lambda isolate).
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

/** Standard IP limits for sensitive actions */
export function limitByIp(
  ip: string,
  action: string,
  limit: number,
  windowMs: number
) {
  return hitRateLimit(`ip:${action}:${ip || "unknown"}`, limit, windowMs);
}
