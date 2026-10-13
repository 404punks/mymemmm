import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const blocked = (process.env.GEO_BLOCK_COUNTRIES || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  if (blocked.length === 0) return NextResponse.next();
  const country = (request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || "").toUpperCase();
  if (country && blocked.includes(country)) {
    return new NextResponse("VEIL is not available in your region.", { status: 451 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)"] };
