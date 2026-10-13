import { requireSession } from "@/lib/auth";
import { creationCostLines } from "@/lib/fees";
import { assertSameOrigin, clientIp, errorResponse, json, HttpError } from "@/lib/http";
import { assertRate } from "@/lib/rate-limit";
import { buildTradeSchema } from "@/lib/validation";
import { readCurve, solBalance, tokenBalance } from "@/lib/solana/chain";
import { fetchLocalTransaction, networkFeeLamports, toBase64, tradePayload } from "@/lib/solana/portal";
import { uiTokensToRaw } from "@/lib/tiers";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    assertRate(`trade:${session.walletAddress}:${clientIp(request)}`, 20);
    const body = buildTradeSchema.parse(await request.json());
    if (body.publicKey !== session.walletAddress) throw new HttpError("The wallet connected does not match the signed-in account.", 403, "wallet_mismatch");
    const curve = await readCurve(body.mint);
    if (!curve.found) throw new HttpError(curve.note, 404, "curve_missing");
    if (curve.complete && !curve.poolAccount?.found) {
      throw new HttpError("The bonding curve is complete and the PumpSwap pool account was not found. No trade was built.", 409, "pool_missing");
    }
    if (body.action === "buy" && body.denominatedInSol && typeof body.amount === "number") {
      const lamports = await solBalance(body.publicKey);
      const needed = BigInt(Math.ceil(body.amount * 1_000_000_000)) + BigInt(Math.ceil(body.priorityFee * 1_000_000_000)) + 20_000n;
      if (lamports < needed) throw new HttpError("The wallet does not have enough SOL for this buy and the priority fee.", 400, "insufficient_sol");
    }
    if (body.action === "sell" && typeof body.amount === "number" && !body.denominatedInSol) {
      const balance = await tokenBalance(body.publicKey, body.mint);
      if (balance < uiTokensToRaw(String(body.amount))) throw new HttpError("The wallet does not hold enough of this coin to sell that amount.", 400, "insufficient_tokens");
    }
    const bytes = await fetchLocalTransaction(tradePayload({
      publicKey: body.publicKey,
      mint: body.mint,
      action: body.action,
      amount: body.amount,
      denominatedInSol: body.denominatedInSol,
      slippage: body.slippage,
      priorityFee: body.priorityFee,
      pool: curve.pool,
    }));
    const networkFee = await networkFeeLamports(bytes);
    return json({
      transaction: toBase64(bytes),
      pool: curve.pool,
      costs: creationCostLines({
        devBuySol: body.action === "buy" && body.denominatedInSol && typeof body.amount === "number" ? body.amount : 0,
        priorityFeeSol: body.priorityFee,
        networkFeeLamports: networkFee,
      }).filter((line) => line.label !== "pump.fun create fee" && line.label !== "Later graduation" && line.label !== "Dev buy"),
      tradeFees: "Bonding-curve trades pay 1.25% inside the trade. PumpPortal adds 0.5% on trades it builds. Graduated coins use the PumpSwap schedule from pump.fun/docs/fees. VEIL adds 0.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
