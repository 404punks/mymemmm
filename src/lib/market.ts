import { env } from "./env";
import { prisma } from "./db";

export type MarketSnapshot = {
  available: boolean;
  source: string;
  fetchedAt: string;
  priceUsd: string | null;
  marketCapUsd: number | null;
  volumeUsd24h: number | null;
  liquidityUsd: number | null;
  priceChangeH24: number | null;
  pairUrl: string | null;
  reason?: string;
};

function emptyMarket(reason: string, fetchedAt = new Date().toISOString()): MarketSnapshot {
  return { available: false, source: "dexscreener", fetchedAt, priceUsd: null, marketCapUsd: null, volumeUsd24h: null, liquidityUsd: null, priceChangeH24: null, pairUrl: null, reason };
}

function snapshotFromPair(pair: Record<string, unknown> | undefined, fetchedAt: string): MarketSnapshot {
  if (!pair) return emptyMarket("Dexscreener has no pair for this mint yet.", fetchedAt);
  const liquidity = pair.liquidity as { usd?: number } | undefined;
  const volume = pair.volume as { h24?: number } | undefined;
  const change = pair.priceChange as { h24?: number } | undefined;
  return {
    available: true,
    source: "dexscreener",
    fetchedAt,
    priceUsd: typeof pair.priceUsd === "string" ? pair.priceUsd : null,
    marketCapUsd: typeof pair.marketCap === "number" ? pair.marketCap : null,
    volumeUsd24h: typeof volume?.h24 === "number" ? volume.h24 : null,
    liquidityUsd: typeof liquidity?.usd === "number" ? liquidity.usd : null,
    priceChangeH24: typeof change?.h24 === "number" ? change.h24 : null,
    pairUrl: typeof pair.url === "string" ? pair.url : null,
  };
}

export async function dexscreenerMany(mints: string[]): Promise<Map<string, MarketSnapshot>> {
  const fetchedAt = new Date().toISOString();
  const result = new Map<string, MarketSnapshot>();
  const unique = [...new Set(mints)];
  for (let offset = 0; offset < unique.length; offset += 30) {
    const chunk = unique.slice(offset, offset + 30);
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${chunk.join(",")}`, { next: { revalidate: 20 } });
      if (!response.ok) {
        for (const mint of chunk) result.set(mint, emptyMarket(`Dexscreener returned ${response.status}`, fetchedAt));
        continue;
      }
      const body = await response.json() as { pairs?: Array<Record<string, unknown>> };
      const grouped = new Map<string, Record<string, unknown>>();
      for (const pair of body.pairs ?? []) {
        const address = typeof pair.baseToken === "object" && pair.baseToken && "address" in pair.baseToken ? String((pair.baseToken as { address?: string }).address || "") : "";
        if (!address || grouped.has(address) || pair.chainId !== "solana") continue;
        grouped.set(address, pair);
      }
      for (const mint of chunk) result.set(mint, snapshotFromPair(grouped.get(mint), fetchedAt));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Dexscreener request failed";
      for (const mint of chunk) result.set(mint, emptyMarket(reason, fetchedAt));
    }
  }
  return result;
}

export async function dexscreener(mint: string): Promise<MarketSnapshot> {
  const many = await dexscreenerMany([mint]);
  return many.get(mint) ?? emptyMarket("Dexscreener request failed");
}

export async function holderCount(mint: string): Promise<{ count: number; source: string; fetchedAt: string } | null> {
  if (!env.birdeyeKey) return null;
  const response = await fetch(`https://public-api.birdeye.so/defi/token_overview?address=${mint}`, {
    headers: { "X-API-KEY": env.birdeyeKey, "x-chain": "solana" },
  });
  if (!response.ok) return null;
  const body = await response.json() as { data?: { holder?: number } };
  if (typeof body.data?.holder !== "number") return null;
  return { count: body.data.holder, source: "birdeye", fetchedAt: new Date().toISOString() };
}

export async function rememberPrice(mint: string, market: MarketSnapshot) {
  if (!market.available || !market.priceUsd) return;
  const latest = await prisma.pricePoint.findFirst({ where: { mint }, orderBy: { observedAt: "desc" } });
  if (latest && Date.now() - latest.observedAt.getTime() < 10 * 60 * 1000) return;
  await prisma.pricePoint.create({
    data: {
      mint,
      priceUsd: market.priceUsd,
      marketCapUsd: market.marketCapUsd?.toString() ?? null,
      volumeUsd: market.volumeUsd24h?.toString() ?? null,
      source: market.source,
    },
  });
}
