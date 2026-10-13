import Link from "next/link";
import type { TokenCardModel } from "@/lib/cards";

function money(value: number | null) {
  if (value == null) return "Market cap not on Dexscreener yet";
  return `Market cap $${Math.round(value).toLocaleString("en-US")}`;
}

export function TokenCard({ token, extra }: { token: TokenCardModel; extra?: string }) {
  const width = token.progress == null ? 0 : Math.round(token.progress * 100);
  return (
    <Link href={`/token/${token.mint}`} className="panel token-card">
      <img src={token.imageUrl} alt="" width={72} height={72} />
      <div>
        <h2>{token.name} <span className="muted">{token.symbol}</span></h2>
        <p className="muted">{token.genre} · {token.chapterCount} {token.chapterCount === 1 ? "chapter" : "chapters"}</p>
        <p>{money(token.marketCapUsd)}</p>
        {extra ? <p className="muted">{extra}</p> : null}
        <div className="progress" role="img" aria-label={token.progressNote}>
          {token.progress != null ? <span style={{ width: `${width}%` }} /> : null}
        </div>
        <p className="muted">{token.progressNote}</p>
      </div>
    </Link>
  );
}
