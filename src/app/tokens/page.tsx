import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { listTokens } from "@/lib/queries";
import { shortAddress } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tokens" };

export default async function TokensPage() {
  const tokens = await listTokens();
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Tokens</h1>
      <p className="text-sm text-paper-dim">Rows come from the database. Live market fields load on each token page from the chain or Dexscreener.</p>
      {tokens.length === 0 ? <EmptyState title="No tokens" body="A confirmed devnet launch will show up here." /> : (
        <div className="grid-cards">
          {tokens.map((token) => (
            <Link key={token.mintAddress} href={`/token/${token.mintAddress}`} className="panel p-4">
              <div className="flex items-center gap-3">
                {token.imageUrl ? <img alt="" src={token.imageUrl} className="h-12 w-12 rounded-xl" /> : null}
                <div>
                  <h2>{token.name}</h2>
                  <p className="font-mono text-xs text-paper-faint">{token.symbol} · {shortAddress(token.mintAddress, 5)}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {token.isDemo ? <Badge tone="warn">Sample</Badge> : <Badge tone={token.status === "confirmed" ? "ok" : "default"}>{token.status}</Badge>}
                {token.bondingComplete ? <Badge tone="violet">Complete</Badge> : null}
              </div>
              {token.aiSummary ? <p className="mt-2 text-xs text-paper-dim"><Badge tone="violet">AI</Badge> {token.aiSummary}</p> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
