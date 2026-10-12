import { assertRate } from "@/lib/api";
import { quoteTrade, readTokenState } from "@/lib/solana/market";
import { errorResponse, json } from "@/lib/http";
import { quoteSchema } from "@/lib/validation";
import { clusterSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    assertRate(request, "state", 40);
    const url = new URL(request.url);
    const network = clusterSchema.parse(url.searchParams.get("network") || "devnet");
    const mint = url.searchParams.get("mint") || "";
    return json(await readTokenState(network, mint));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertRate(request, "quote", 30);
    const body = quoteSchema.parse(await request.json());
    return json(await quoteTrade(body));
  } catch (error) {
    return errorResponse(error);
  }
}
