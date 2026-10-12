import { rateLimit } from "./rate-limit";
import { HttpError } from "./http";
import { secretsMatch } from "./auth";
import { env } from "./env";

export function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "local";
}

export function assertRate(request: Request, bucket: string, limit: number, windowMs = 60_000) {
  const result = rateLimit(`${bucket}:${clientKey(request)}`, limit, windowMs);
  if (!result.ok) throw new HttpError("Too many requests. Wait a minute and retry.", 429, "rate_limited");
}

export function assertAdmin(request: Request) {
  if (env.allowIndexTrigger && !env.adminApiKey) return;
  const provided = request.headers.get("x-admin-key") || "";
  if (!secretsMatch(provided, env.adminApiKey)) {
    throw new HttpError("Admin key required", 401, "admin_required");
  }
}
