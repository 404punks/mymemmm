import { z } from "zod";
import { assertSameOrigin, clientIp, errorResponse, json } from "@/lib/http";
import { assertRate } from "@/lib/rate-limit";
import { quoteTrade } from "@/lib/solana/chain";

const schema = z.object({
  mint: z.string().min(32).max(44),
  user: z.string().min(32).max(44),
  side: z.enum(["buy", "sell"]),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  denominatedInSol: z.boolean(),
  slippage: z.number().min(0).max(50),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertRate(`quote:${clientIp(request)}`, 30);
    const body = schema.parse(await request.json());
    return json(await quoteTrade(body));
  } catch (error) {
    return errorResponse(error);
  }
}
