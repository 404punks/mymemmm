import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return json(
      {
        error: "Invalid input",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      400,
    );
  }
  if (error instanceof HttpError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  console.error(error);
  return json({ error: "Unexpected server error" }, 500);
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "bad_request",
  ) {
    super(message);
  }
}
