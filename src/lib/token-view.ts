import { prisma } from "./db";
import { readSession } from "./auth";
import { HttpError } from "./http";
import { dexscreener, holderCount, rememberPrice } from "./market";
import { largestAccounts, readCurve, tokenBalance } from "./solana/chain";
import { visibleChapters } from "./tiers";
import { env } from "./env";

export async function loadTokenView(mint: string) {
  const token = await prisma.token.findUnique({
    where: { mint },
    include: { character: true, chapters: true, observations: { orderBy: { observedAt: "asc" }, take: 200 } },
  });
  if (!token) throw new HttpError("This mint is not a VEIL launch.", 404, "not_found");
  const session = await readSession();
  let balance = 0n;
  let balanceError: string | null = null;
  if (session) {
    try {
      balance = await tokenBalance(session.walletAddress, mint);
    } catch (error) {
      balanceError = error instanceof Error ? error.message : "Balance read failed";
    }
  }
  const [curve, market, holders, largest] = await Promise.all([
    readCurve(mint).catch((error: Error) => ({ found: false as const, fetchedAt: new Date().toISOString(), note: error.message })),
    dexscreener(mint),
    holderCount(mint),
    largestAccounts(mint).catch((error: Error) => ({ fetchedAt: new Date().toISOString(), source: "rpc", note: error.message, accounts: [] })),
  ]);
  if (market.available) await rememberPrice(mint, market).catch(() => undefined);
  if (curve.found && curve.complete && !token.graduated) {
    await prisma.token.update({ where: { mint }, data: { graduated: true } });
  }
  return {
    token: {
      mint: token.mint,
      name: token.name,
      symbol: token.symbol,
      description: token.description,
      imageUrl: token.imageUrl,
      metadataUri: token.metadataUri,
      creatorWallet: token.creatorWallet,
      curveCreator: token.curveCreator,
      twitter: token.twitter,
      telegram: token.telegram,
      website: token.website,
      genre: token.genre,
      signature: token.signature,
      createdAt: token.createdAt.toISOString(),
      devBuySol: token.devBuySol,
      nextHolderGoal: token.nextHolderGoal,
      character: token.character,
    },
    chapters: visibleChapters(token.chapters, balance),
    balance: { raw: balance.toString(), wallet: session?.walletAddress ?? null, error: balanceError },
    curve,
    market,
    holders,
    largest,
    observations: token.observations.map((point) => ({
      priceUsd: point.priceUsd,
      observedAt: point.observedAt.toISOString(),
      source: point.source,
    })),
    holderGoalNote: holders
      ? `The next chapter is written at ${token.nextHolderGoal ?? env.chapterHolderGoal} holders.`
      : "Holder count is not available from the configured source, so the next chapter cannot be scheduled. No holder number was invented.",
  };
}
