import 'server-only';

/**
 * Fixed-window in-memory rate limiter.
 *
 * Scoped to a single server instance, which is the right trade-off here: it
 * costs no extra infrastructure and stops the abuse case that matters (one
 * client hammering the endpoint). A serverless deployment runs several
 * instances, so the effective ceiling is per-instance — for a hard global cap,
 * swap this module for a Redis/Upstash counter behind the same signature.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
/** Bound the map so a flood of unique keys cannot exhaust memory. */
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets — sent as `Retry-After`. */
  retryAfterSeconds: number;
};

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) sweep(now);
    windows.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const remaining = options.limit - existing.count;
  if (remaining < 0) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining, retryAfterSeconds: 0 };
}

/** Test seam. */
export function __resetRateLimits(): void {
  windows.clear();
}
