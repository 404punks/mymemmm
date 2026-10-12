import { clearSessionCookie, sessionUser } from "@/lib/auth";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await sessionUser(request.headers.get("cookie"));
  if (!user) return json({ authenticated: false });
  return json({ authenticated: true, walletAddress: user.walletAddress, displayName: user.displayName });
}

export async function DELETE() {
  const response = json({ authenticated: false });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
