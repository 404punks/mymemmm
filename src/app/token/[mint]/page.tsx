import Link from "next/link";
import { notFound } from "next/navigation";
import { HttpError } from "@/lib/http";
import { loadTokenView } from "@/lib/token-view";
import { rawToUi } from "@/lib/tiers";
import { PriceChart } from "@/components/price-chart";
import { TradePanel } from "@/components/trade-panel";
import { ReportForm } from "@/components/report-form";

export const dynamic = "force-dynamic";

export default async function TokenPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  let view;
  try {
    view = await loadTokenView(mint);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    return <div className="page"><p className="rose" role="alert">{error instanceof Error ? error.message : "Could not load this coin."}</p></div>;
  }
  const curve = view.curve;
  const progress = curve.found && typeof curve.progress === "number" ? Math.round(curve.progress * 100) : null;
  return (
    <div className="page">
      <header style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <img src={view.token.imageUrl} alt="" width={84} height={84} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 18 }} />
        <div>
          <p className="kicker">{view.token.genre} · {curve.found ? (curve.complete ? "Graduated" : "Bonding curve") : "Curve unread"}</p>
          <h1 style={{ fontFamily: "var(--font-display), serif", fontSize: 48, margin: "4px 0" }}>{view.token.name} <span className="muted">{view.token.symbol}</span></h1>
          <p className="muted" style={{ maxWidth: 640 }}>{view.token.description}</p>
        </div>
      </header>
      <div className="split" style={{ marginTop: 18 }}>
        <div className="grid" style={{ display: "grid", gap: 16 }}>
          <section className="panel" style={{ padding: 16 }}>
            <h2 style={{ fontFamily: "var(--font-display), serif", marginTop: 0 }}>Market</h2>
            {view.market.available ? (
              <dl className="grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><dt className="muted">Price</dt><dd>{view.market.priceUsd ? `$${view.market.priceUsd}` : "—"}</dd></div>
                <div><dt className="muted">Market cap</dt><dd>{view.market.marketCapUsd != null ? `$${Math.round(view.market.marketCapUsd).toLocaleString()}` : "—"}</dd></div>
                <div><dt className="muted">Volume 24h</dt><dd>{view.market.volumeUsd24h != null ? `$${Math.round(view.market.volumeUsd24h).toLocaleString()}` : "—"}</dd></div>
                <div><dt className="muted">Source</dt><dd>{view.market.source} · {view.market.fetchedAt}</dd></div>
              </dl>
            ) : <p className="muted">{view.market.reason} No price was substituted.</p>}
            {curve.found && curve.marketCapQuoteLamports ? <p className="muted">Curve market cap {Number(curve.marketCapQuoteLamports) / 1e9} SOL, from the bonding-curve reserves. Not a dollar figure.</p> : null}
            {progress != null ? <div><div className="progress" aria-label="Bonding curve progress"><span style={{ width: `${progress}%` }} /></div><p className="muted">{progress}% of the curve is filled.</p></div> : <p className="muted">{curve.found ? curve.complete ? "The curve is complete, so curve progress is not shown." : "Curve progress was not available." : curve.note}</p>}
            <PriceChart points={view.observations} />
          </section>
          <section className="panel" style={{ padding: 16 }}>
            <h2 style={{ fontFamily: "var(--font-display), serif", marginTop: 0 }}>Chapters</h2>
            <p className="muted">{view.balance.wallet ? `Signed in as ${view.balance.wallet}. Balance ${rawToUi(BigInt(view.balance.raw))} tokens.` : "Sign in to read sealed chapters. The server does not send their text until the balance qualifies."}</p>
            {view.balance.error ? <p className="rose" role="alert">Balance could not be read, so sealed chapters stay sealed. {view.balance.error}</p> : null}
            {view.chapters.map((chapter) => (
              <article key={chapter.index} className="panel" style={{ padding: 12, marginTop: 10 }}>
                <h3 style={{ margin: 0 }}>{chapter.title}</h3>
                {"locked" in chapter && chapter.locked ? (
                  <div>
                    <p>Sealed until the wallet holds {chapter.minTokens} tokens.</p>
                    <div className="sealed-bar" aria-hidden="true" />
                  </div>
                ) : <p>{"body" in chapter ? chapter.body : ""}</p>}
              </article>
            ))}
            <p className="muted">{view.holderGoalNote}{view.holders ? ` Current holders ${view.holders.count} via ${view.holders.source} at ${view.holders.fetchedAt}.` : ""}</p>
            {view.chapters.some((chapter) => !chapter.locked && chapter.index >= 2) && view.token.character ? (
              <div className="panel" style={{ padding: 16, marginTop: 12, background: "linear-gradient(160deg, #141a33, #2a1d08)" }}>
                <p className="kicker">Holding card</p>
                <h3 style={{ fontFamily: "var(--font-display), serif" }}>{view.token.character.name}</h3>
                <p>{view.token.character.epithet}</p>
                <p className="muted">This card is a view for wallets that unlocked chapter two or later. It is not a separate token.</p>
              </div>
            ) : null}
          </section>
        </div>
        <div className="grid" style={{ display: "grid", gap: 16 }}>
          <TradePanel mint={view.token.mint} pool={curve.found ? curve.pool : null} />
          <section className="panel" style={{ padding: 16 }}>
            <h2 style={{ fontFamily: "var(--font-display), serif", marginTop: 0 }}>Identity</h2>
            <p>Mint {view.token.mint}</p>
            <p>Creator {view.token.creatorWallet}</p>
            <p className="muted">Curve creator {view.token.curveCreator || "not read"}</p>
            <p><a className="gold" href={`https://solscan.io/tx/${view.token.signature}`}>Creation transaction</a></p>
            <p><a className="gold" href={`https://solscan.io/token/${view.token.mint}`}>Token on Solscan</a></p>
            <p><Link href={`/character/${view.token.mint}`}>Character dossier</Link></p>
            <h3>Largest accounts</h3>
            <p className="muted">{view.largest.note}</p>
            <ul>{view.largest.accounts.slice(0, 8).map((account) => <li key={account.address}>{account.address.slice(0, 4)}…{account.address.slice(-4)} · {account.uiAmount ?? account.amount}</li>)}</ul>
            <ReportForm mint={view.token.mint} />
          </section>
        </div>
      </div>
      <p className="muted">Meme coins can lose all of their value. Nothing on this page is financial advice or a promise that a chapter, a holder count, or a price will arrive.</p>
    </div>
  );
}
