import { prisma } from "@/lib/db";
import { assertRate } from "@/lib/api";
import { analyzeToken } from "@/lib/ai/workflows";
import { readTokenState } from "@/lib/solana/market";
import { readDexScreener } from "@/lib/solana/external";
import { isValidPublicKey } from "@/lib/solana/cluster";
import { errorResponse, json } from "@/lib/http";
import { analyzeSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertRate(request, "analyze", 12);
    const body = analyzeSchema.parse(await request.json());
    const record = await prisma.token.findUnique({ where: { mintAddress: body.mint } });
    const missing: string[] = [];
    let facts: Record<string, unknown> = { mint: body.mint, network: body.network };
    if (record) {
      facts = {
        ...facts,
        name: record.name,
        symbol: record.symbol,
        description: record.description,
        status: record.status,
        isDemo: record.isDemo,
        creator: record.creatorAddress,
        creatorSource: record.creatorSource,
      };
      if (record.isDemo) missing.push("demo record is not an on-chain market");
    } else {
      missing.push("no Neuralpad token record");
    }
    if (isValidPublicKey(body.mint) && !record?.isDemo) {
      try {
        const chain = await readTokenState(body.network, body.mint);
        facts.chain = chain;
        if (!chain.found) missing.push("bonding curve account");
      } catch (error) {
        missing.push(error instanceof Error ? error.message : "chain read failed");
      }
      facts.market = await readDexScreener(body.mint);
      if (!facts.market || (facts.market as { available?: boolean }).available === false) {
        missing.push("dexscreener pair");
      }
    }
    const analysis = await analyzeToken({ mint: body.mint, facts, missing });
    return json({ facts, missing, analysis, observedAt: new Date().toISOString() });
  } catch (error) {
    return errorResponse(error);
  }
}
