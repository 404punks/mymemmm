import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { creationCostLines } from "@/lib/fees";
import { assertSameOrigin, clientIp, errorResponse, json, HttpError } from "@/lib/http";
import { assertRate } from "@/lib/rate-limit";
import { buildCreateSchema } from "@/lib/validation";
import { createPayload, fetchLocalTransaction, networkFeeLamports, toBase64 } from "@/lib/solana/portal";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    assertRate(`build:${session.walletAddress}:${clientIp(request)}`, 12);
    const body = buildCreateSchema.parse(await request.json());
    if (body.publicKey !== session.walletAddress) throw new HttpError("The wallet connected does not match the signed-in account.", 403, "wallet_mismatch");
    const draft = await prisma.draft.findUnique({ where: { id: body.draftId } });
    if (!draft || draft.creatorWallet !== session.walletAddress) throw new HttpError("Draft not found", 404, "not_found");
    if (!draft.metadataUri) throw new HttpError("Upload metadata before building the transaction.", 400, "metadata_missing");
    const base = {
      publicKey: body.publicKey,
      mint: body.mint,
      name: draft.name,
      symbol: draft.symbol,
      uri: draft.metadataUri,
      slippage: body.slippage,
      priorityFee: body.priorityFee,
    };
    try {
      const bytes = await fetchLocalTransaction(createPayload({ ...base, amount: body.devBuySol }));
      const networkFeeLamportsValue = await networkFeeLamports(bytes);
      return json({
        mode: "create",
        transaction: toBase64(bytes),
        costs: creationCostLines({ devBuySol: body.devBuySol, priorityFeeSol: body.priorityFee, networkFeeLamports: networkFeeLamportsValue }),
        note: "Sign with the mint keypair first, then with your wallet. VEIL never sees the mint secret.",
      });
    } catch (error) {
      if (!(error instanceof HttpError) || error.code !== "create_amount_rejected" || body.devBuySol === 0) throw error;
      const bytes = await fetchLocalTransaction(createPayload({ ...base, amount: 0 }));
      const networkFeeLamportsValue = await networkFeeLamports(bytes);
      return json({
        mode: "create-then-buy",
        transaction: toBase64(bytes),
        costs: creationCostLines({ devBuySol: body.devBuySol, priorityFeeSol: body.priorityFee, networkFeeLamports: networkFeeLamportsValue }),
        note: "PumpPortal rejected a create transaction that included the dev buy. This first transaction creates the coin with a zero buy. After it confirms, VEIL will ask you to sign a separate buy.",
      });
    }
  } catch (error) {
    return errorResponse(error);
  }
}
