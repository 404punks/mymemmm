import Link from "next/link";
import { decorateTokens, type TokenCardModel } from "@/lib/cards";
import { prisma } from "@/lib/db";
import { TokenCard } from "@/components/token-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

const SORTS = [
  { id: "new", label: "New" },
  { id: "trending", label: "Trending" },
  { id: "holders", label: "Most holders" },
  { id: "chapters", label: "Chapters unlocked" },
] as const;

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ sort?: string; q?: string }> }) {
  const params = await searchParams;
  const sort = SORTS.some((item) => item.id === params.sort) ? params.sort! : "new";
  const q = (params.q || "").trim();
  let error = "";
  let cards: TokenCardModel[] = [];
  try {
    const tokens = await prisma.token.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { symbol: { contains: q, mode: "insensitive" } }] } : {},
      include: { _count: { select: { chapters: true } } },
      orderBy: { createdAt: "desc" },
      take: 48,
    });
    cards = await decorateTokens(tokens.map((token) => ({
      mint: token.mint,
      name: token.name,
      symbol: token.symbol,
      imageUrl: token.imageUrl,
      genre: token.genre,
      chapterCount: token._count.chapters,
    })), { holders: sort === "holders" });
    cards.sort((a, b) => {
      if (sort === "chapters") return b.chapterCount - a.chapterCount;
      if (sort === "trending") return (b.volumeUsd24h ?? -1) - (a.volumeUsd24h ?? -1);
      if (sort === "holders") return (b.holderCount ?? -1) - (a.holderCount ?? -1);
      return 0;
    });
  } catch (err) {
    console.error(err);
    error = "Could not read the database. Start Postgres and run npx prisma db push.";
  }
  return (
    <div className="page">
      <h1 className="section-title">Explore</h1>
      <form className="toolbar" action="/explore">
        <Input name="q" defaultValue={q} placeholder="Search name or ticker" aria-label="Search" className="search" />
        <input type="hidden" name="sort" value={sort} />
        <Button type="submit">Search</Button>
      </form>
      <div className="toolbar">
        {SORTS.map((item) => (
          <Button key={item.id} asChild variant={sort === item.id ? "gold" : "default"}>
            <Link href={`/explore?sort=${item.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>{item.label}</Link>
          </Button>
        ))}
      </div>
      {error ? <p className="rose" role="alert">{error}</p> : null}
      {cards.length === 0 && !error ? (
        <div className="panel stack">
          <p>Nothing confirmed matches this view.</p>
          <Button variant="gold" asChild><Link href="/launch">Launch a coin</Link></Button>
        </div>
      ) : (
        <div className="grid-cards">
          {cards.map((token) => (
            <TokenCard
              key={token.mint}
              token={token}
              extra={sort === "holders" ? (token.holderCount == null ? "Holder count unavailable" : `${token.holderCount} holders`) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
