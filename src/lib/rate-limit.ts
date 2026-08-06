type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Simple fixed-window rate limit (per server instance).
 * Returns null if allowed, or retryAfterSeconds if blocked.
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
    return { ok: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}
