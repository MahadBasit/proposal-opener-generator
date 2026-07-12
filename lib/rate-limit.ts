const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_TRACKED_IPS = 1_000;

type Bucket = {
  count: number;
  windowStart: number;
};

// In-memory, per-function-instance. Resets on cold start and is not shared
// across instances — accepted tradeoff for a cheap public-route limiter.
const buckets = new Map<string, Bucket>();

function pruneExpired(now: number): void {
  for (const [ip, bucket] of buckets) {
    if (now - bucket.windowStart >= WINDOW_MS) {
      buckets.delete(ip);
    }
  }
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();

  if (buckets.size >= MAX_TRACKED_IPS) {
    pruneExpired(now);
  }

  const bucket = buckets.get(ip);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil(
      (bucket.windowStart + WINDOW_MS - now) / 1000,
    );
    return { allowed: false, retryAfterSeconds };
  }

  buckets.set(ip, { count: bucket.count + 1, windowStart: bucket.windowStart });
  return { allowed: true };
}
