import { getEcosystemStats } from "@/lib/stats";
import { json, errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await getEcosystemStats());
  } catch (error) {
    return errorResponse(error);
  }
}
