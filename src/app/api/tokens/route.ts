import { prisma } from "@/lib/db";
import { errorResponse, json } from "@/lib/http";
import { dexscreener, holderCount } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sort = url.searchParams.get("sort") || "new";
    const genre = url.searchParams.get("genre") || "";
    const q = (url.searchParams.get("q") || "").trim();
    const tokens = await prisma.token.findMany({
      where: {
        ...(genre ? { genre } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { symbol: { contains: q, mode: "insensitive" } }] } : {}),
      },
      include: { character: true, _count: { select: { chapters: true } } },
      orderBy: { createdAt: "desc" },
      take: 48,
    });
    const cards = await Promise.all(tokens.map(async (token) => {
      const market = sort === "trending" ? await dexscreener(token.mint) : null;
      const holders = sort === "holders" ? await holderCount(token.mint) : null;
      return {
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        genre: token.genre,
        imageUrl: token.imageUrl,
        creatorWallet: token.creatorWallet,
        createdAt: token.createdAt,
        graduated: token.graduated,
        chapterCount: token._count.chapters,
        epithet: token.character?.epithet ?? null,
        marketCapUsd: market?.marketCapUsd ?? null,
        volumeUsd24h: market?.volumeUsd24h ?? null,
        holderCount: holders?.count ?? null,
        holderSource: holders?.source ?? null,
      };
    }));
    cards.sort((a, b) => {
      if (sort === "chapters") return b.chapterCount - a.chapterCount;
      if (sort === "trending") return (b.volumeUsd24h ?? -1) - (a.volumeUsd24h ?? -1);
      if (sort === "holders") return (b.holderCount ?? -1) - (a.holderCount ?? -1);
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
    return json({ items: cards, sort });
  } catch (error) {
    return errorResponse(error);
  }
}
