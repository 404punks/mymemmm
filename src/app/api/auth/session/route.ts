import { clearSession, readSession } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await readSession();
    return json({ authenticated: Boolean(session), walletAddress: session?.walletAddress ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  try {
    await clearSession();
    return json({ authenticated: false });
  } catch (error) {
    return errorResponse(error);
  }
}
