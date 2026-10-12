import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { tokenBalance } from "@/lib/solana/chain";
import { chapterUnlocked, rawToUi } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    const tokens = await prisma.token.findMany({
      include: { chapters: true, character: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const launched = tokens.filter((token) => token.creatorWallet === session.walletAddress);
    const holdings = [];
    for (const token of tokens) {
      try {
        const raw = await tokenBalance(session.walletAddress, token.mint);
        if (raw === 0n && token.creatorWallet !== session.walletAddress) continue;
        const unlocked = token.chapters.filter((chapter) => chapterUnlocked(raw, chapter.minTokens)).map((chapter) => chapter.index);
        if (raw === 0n && unlocked.length === 0) continue;
        holdings.push({
          mint: token.mint,
          name: token.name,
          symbol: token.symbol,
          imageUrl: token.imageUrl,
          balance: rawToUi(raw),
          unlocked,
        });
      } catch {
        if (token.creatorWallet === session.walletAddress) {
          holdings.push({ mint: token.mint, name: token.name, symbol: token.symbol, imageUrl: token.imageUrl, balance: null, unlocked: [], error: "Balance read failed" });
        }
      }
    }
    return json({
      walletAddress: session.walletAddress,
      launched: launched.map((token) => ({ mint: token.mint, name: token.name, symbol: token.symbol, imageUrl: token.imageUrl, createdAt: token.createdAt })),
      holdings: holdings.filter((item) => item.balance !== "0" || launched.some((token) => token.mint === item.mint)),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
