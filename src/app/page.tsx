import Link from "next/link";
import { decorateTokens } from "@/lib/cards";
import { prisma } from "@/lib/db";
import { DossierSlider } from "@/components/dossier-slider";
import { TokenCard } from "@/components/token-card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let cards: Awaited<ReturnType<typeof decorateTokens>> = [];
  let databaseError = "";
  try {
    const tokens = await prisma.token.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { _count: { select: { chapters: true } } },
    });
    cards = await decorateTokens(tokens.map((token) => ({
      mint: token.mint,
      name: token.name,
      symbol: token.symbol,
      imageUrl: token.imageUrl,
      genre: token.genre,
      chapterCount: token._count.chapters,
    })));
  } catch (error) {
    console.error(error);
    databaseError = "The database is not ready. Start Postgres and run npx prisma db push.";
  }
  return (
    <div className="page">
      <section className="split hero">
        <div>
          <h1 className="h1">Hold the coin. Read the character.</h1>
          <p className="lede">
            VEIL launches a pump.fun coin from this site on Solana mainnet. Each coin is bound to an original character and four chapters. Later chapters stay on the server until a wallet&apos;s real balance crosses the tier. Selling seals them again.
          </p>
          <div className="actions">
            <Button variant="gold" asChild><Link href="/launch">Launch a coin</Link></Button>
            <Button asChild><Link href="/explore">Explore dossiers</Link></Button>
          </div>
          <p className="muted fine">No VEIL fee. You pay Solana, pump.fun, and PumpPortal&apos;s trade fee. Coins can go to zero.</p>
        </div>
        <DossierSlider />
      </section>
      <section className="section">
        <h2 className="section-title">Latest launches</h2>
        {databaseError ? <p className="rose" role="alert">{databaseError}</p> : null}
        {cards.length === 0 && !databaseError ? (
          <div className="panel stack">
            <p>No coins have been confirmed yet.</p>
            <Button variant="gold" asChild><Link href="/launch">Launch the first dossier</Link></Button>
          </div>
        ) : (
          <div className="grid-cards">
            {cards.map((token) => <TokenCard key={token.mint} token={token} />)}
          </div>
        )}
      </section>
    </div>
  );
}
