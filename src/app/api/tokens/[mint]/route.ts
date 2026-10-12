import { loadTokenView } from "@/lib/token-view";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await context.params;
    return json(await loadTokenView(mint));
  } catch (error) {
    return errorResponse(error);
  }
}
