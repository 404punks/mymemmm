import { ZodError } from "zod";
import { NextResponse } from "next/server";

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "bad_request") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function publicErrorMessage(message: string) {
  if (/postgres(ql)?:\/\//i.test(message) || /api-key=|secret|password/i.test(message)) {
    return "The server hit a configuration error. Details stayed in the logs.";
  }
  return message.slice(0, 400);
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    const message = error.issues.map((issue) => issue.message).join(" ");
    return json({ error: message || "Invalid input", code: "invalid_input" }, 400);
  }
  if (error instanceof HttpError) {
    return json({ error: publicErrorMessage(error.message), code: error.code }, error.status);
  }
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error(JSON.stringify({ level: "error", message }));
  return json({ error: publicErrorMessage(message), code: "server_error" }, 500);
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError("Cross-origin request blocked", 403, "csrf");
  }
  if (!host || originHost !== host) throw new HttpError("Cross-origin request blocked", 403, "csrf");
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
