import { rpcProblem } from "./env";
import { dexscreenerMany, holderCount } from "./market";
import { readCurve } from "./solana/chain";

export type ListedToken = {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string;
  genre: string;
  chapterCount: number;
};

export type TokenCardModel = ListedToken & {
  marketCapUsd: number | null;
  volumeUsd24h: number | null;
  holderCount: number | null;
  progress: number | null;
  graduated: boolean;
  progressNote: string;
};

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function decorateTokens(tokens: ListedToken[], options: { holders?: boolean } = {}): Promise<TokenCardModel[]> {
  if (tokens.length === 0) return [];
  const markets = await dexscreenerMany(tokens.map((token) => token.mint));
  const rpcNote = rpcProblem();
  const curves = rpcNote
    ? tokens.map(() => null)
    : await mapLimited(tokens, 4, async (token) => readCurve(token.mint).catch(() => null));
  const holders = options.holders
    ? await mapLimited(tokens, 4, async (token) => holderCount(token.mint).catch(() => null))
    : tokens.map(() => null);
  return tokens.map((token, index) => {
    const market = markets.get(token.mint);
    const curve = curves[index];
    const progress = curve && curve.found && typeof curve.progress === "number" && !curve.complete ? curve.progress : null;
    let progressNote = "Curve progress is unavailable.";
    if (rpcNote) progressNote = rpcNote;
    else if (curve && !curve.found) progressNote = curve.note;
    else if (curve?.found && curve.complete) progressNote = "Graduated. Curve progress no longer applies.";
    else if (progress != null) progressNote = `${Math.round(progress * 100)}% of the bonding curve is filled.`;
    return {
      ...token,
      marketCapUsd: market?.available ? market.marketCapUsd : null,
      volumeUsd24h: market?.available ? market.volumeUsd24h : null,
      holderCount: holders[index]?.count ?? null,
      progress,
      graduated: Boolean(curve && curve.found && curve.complete),
      progressNote,
    };
  });
}
