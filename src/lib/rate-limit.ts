type Bucket = { tokens: number; updated: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number } {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.updated >= windowMs) {
    buckets.set(key, { tokens: limit - 1, updated: now });
    return { ok: true, remaining: limit - 1 };
  }
  if (current.tokens <= 0) {
    return { ok: false, remaining: 0 };
  }
  current.tokens -= 1;
  return { ok: true, remaining: current.tokens };
}

export function resetRateLimits() {
  buckets.clear();
}
