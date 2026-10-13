import { HttpError } from "./http";

const buckets = new Map<string, { count: number; reset: number }>();

export function assertRate(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) throw new HttpError("Too many requests. Wait a minute and try again.", 429, "rate_limited");
}
