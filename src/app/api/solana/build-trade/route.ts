import { assertRate } from "@/lib/api";
import { buildTradeTransaction } from "@/lib/solana/market";
import { errorResponse, json } from "@/lib/http";
import { buildTradeSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertRate(request, "build-trade", 20);
    const body = buildTradeSchema.parse(await request.json());
    return json(await buildTradeTransaction(body));
  } catch (error) {
    return errorResponse(error);
  }
}
