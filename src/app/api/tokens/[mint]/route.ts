import { prisma } from "@/lib/db";
import { readDexScreener, readLargestAccounts } from "@/lib/solana/external";
import { readTokenState } from "@/lib/solana/market";
import { isValidPublicKey } from "@/lib/solana/cluster";
import { errorResponse, json, HttpError } from "@/lib/http";
import { clusterSchema } from "@/lib/validation";
import type { SolanaCluster } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await context.params;
    const network = clusterSchema.parse(new URL(request.url).searchParams.get("network") || "devnet") as SolanaCluster;
    const record = await prisma.token.findUnique({
      where: { mintAddress: mint },
      include: { observations: { orderBy: { observedAt: "desc" }, take: 24 }, trades: { orderBy: { createdAt: "desc" }, take: 12 }, agent: true },
    });
    if (!record && !isValidPublicKey(mint)) throw new HttpError("Token not found", 404, "not_found");
    let chain: unknown = null;
    let market: unknown = null;
    let holders: unknown = null;
    if (isValidPublicKey(mint) && !record?.isDemo) {
      try {
        chain = await readTokenState(network, mint);
      } catch (error) {
        chain = { found: false, error: error instanceof Error ? error.message : "Chain read failed" };
      }
      market = await readDexScreener(mint);
      const supply = chain && typeof chain === "object" && "tokenTotalSupply" in chain ? String((chain as { tokenTotalSupply?: string }).tokenTotalSupply ?? "") : null;
      holders = await readLargestAccounts(network, mint, supply);
      if (market && typeof market === "object" && "available" in market && (market as { available: boolean }).available) {
        const live = market as { priceUsd?: string | null; marketCapUsd?: number | null; volumeUsd24h?: number | null; liquidityUsd?: number | null };
        const latest = record?.observations[0];
        const stale = !latest || Date.now() - latest.observedAt.getTime() > 10 * 60 * 1000;
        if (record && stale) {
          await prisma.priceObservation.create({
            data: {
              tokenId: record.id,
              source: "dexscreener",
              priceUsd: live.priceUsd ?? null,
              marketCapUsd: live.marketCapUsd != null ? String(live.marketCapUsd) : null,
              volumeUsd: live.volumeUsd24h != null ? String(live.volumeUsd24h) : null,
              liquidityUsd: live.liquidityUsd != null ? String(live.liquidityUsd) : null,
              note: "Observed from Dexscreener at request time",
            },
          });
        }
      }
    }
    return json({
      record: record
        ? {
            ...record,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString(),
            aiSummaryAt: record.aiSummaryAt?.toISOString() ?? null,
            observations: record.observations.map((item) => ({ ...item, observedAt: item.observedAt.toISOString() })),
            trades: record.trades.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
            agent: record.agent ? { handle: record.agent.handle, name: record.agent.name, isDemo: record.agent.isDemo } : null,
          }
        : null,
      chain,
      market,
      holders,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
