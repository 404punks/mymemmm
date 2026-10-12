import { assertRate } from "@/lib/api";
import { buildCreateTransaction } from "@/lib/solana/market";
import { errorResponse, json } from "@/lib/http";
import { buildCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertRate(request, "build-create", 15);
    const body = buildCreateSchema.parse(await request.json());
    return json(await buildCreateTransaction(body));
  } catch (error) {
    return errorResponse(error);
  }
}
