import Link from "next/link";
import { NeuralField } from "@/components/neural-field";
import { Badge, EmptyState } from "@/components/ui";
import { ageLabel, formatNumber, shortAddress } from "@/lib/format";
import { getEcosystemStats } from "@/lib/stats";
import { listActivity, listIndexPreview, listPublishedAgents, listTokens } from "@/lib/queries";

export const dynamic = "force-dynamic";

const STEPS = [
  "Discover intelligence.",
  "Create an AI agent or token concept.",
  "Generate and review the brand.",
  "Connect a Solana wallet.",
  "Review and sign the token creation transaction.",
  "Monitor the token and agent activity.",
];

export default async function HomePage() {
  const [stats, agents, tokens, index, activity] = await Promise.all([
    getEcosystemStats().catch(() => null),
    listPublishedAgents().catch(() => []),
    listTokens().catch(() => []),
    listIndexPreview().catch(() => ({ items: [], freshness: null })),
    listActivity().catch(() => []),
  ]);

  return (
    <div className="space-y-8">
      <section className="grid-2 items-stretch">
        <div className="flex flex-col justify-between gap-6 py-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan">The intelligence layer for tokens</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight md:text-5xl">
              Ideas Become Agents. Agents Become On-Chain.
            </h1>
            <p className="mt-4 max-w-xl text-paper-dim">
              NEURALPAD indexes public AI systems, keeps assistant profiles separate from autonomous claims, and builds Pump program transactions that you review and sign on Solana.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/agents" className="btn btn-primary">Explore Agents</Link>
            <Link href="/launch" className="btn btn-ghost">Launch a Token</Link>
          </div>
        </div>
        <div className="panel relative h-[320px] overflow-hidden">
          <NeuralField />
          <p className="absolute bottom-3 left-4 text-xs text-paper-faint">Original neural field · not a live model</p>
        </div>
      </section>

      <section aria-label="Ecosystem statistics">
        {!stats ? <EmptyState title="Statistics unavailable" body="The database did not return counts. Start the app after prisma db push and the seed script." /> : null}
        {stats?.mode === "empty" ? <EmptyState title="Index is empty" body="Verified counts are zero because nothing has been indexed yet. Run an index job or publish an agent." /> : null}
        {stats && stats.mode !== "empty" ? (
          <div className="space-y-3">
            {stats.mode === "demo" ? (
              <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <Badge tone="warn">Demo dataset</Badge>
                  <p className="mt-2 text-sm text-paper-dim">Verified live counts are zero. Sample rows below are stored locally and are not live index totals.</p>
                </div>
                <p className="font-mono text-xs text-paper-faint">Updated {ageLabel(stats.generatedAt)}</p>
              </div>
            ) : (
              <p className="text-xs text-paper-faint">Verified counts from the database · {ageLabel(stats.generatedAt)}</p>
            )}
            <div className="stat-strip">
              <Stat label="Indexed agents" value={stats.verified.indexedAgents} />
              <Stat label="Indexed models" value={stats.verified.indexedModels} />
              <Stat label="Tracked tokens" value={stats.verified.trackedTokens} />
              <Stat label="Confirmed launches" value={stats.verified.successfulLaunches} />
            </div>
            {stats.demo ? (
              <p className="text-xs text-paper-faint">
                Sample records in the database: {stats.demo.indexedAgents} agent-like rows, {stats.demo.indexedModels} model rows, {stats.demo.trackedTokens} token rows. {stats.demo.note}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid-2">
        <div>
          <header className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">Featured assistants</h2>
            <Link href="/agents" className="text-sm text-cyan">All agents</Link>
          </header>
          {agents.length === 0 ? <EmptyState title="No published agents" body="Create an assistant profile after you sign in with a wallet." /> : (
            <div className="grid gap-3">
              {agents.slice(0, 3).map((agent) => (
                <Link key={agent.handle} href={`/agents/${agent.handle}`} className="panel block p-4 hover:border-cyan/40">
                  <div className="flex gap-3">
                    <img src={`/avatar/${agent.avatarSeed}`} alt="" width={48} height={48} className="h-12 w-12 rounded-xl" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{agent.name}</h3>
                        <span className="text-sm text-paper-faint">@{agent.handle}</span>
                        {agent.isDemo ? <Badge tone="warn">Sample</Badge> : null}
                        <Badge>{agent.status}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-paper-dim">{agent.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {agent.skills.slice(0, 3).map((skill) => <Badge key={skill} tone="cyan">{skill}</Badge>)}
                      </div>
                      <p className="mt-2 text-xs text-paper-faint">
                        {agent.modelId ? `Model ${agent.providerId}/${agent.modelId}` : "Model not configured"} · {agent.autonomy.replaceAll("-", " ")}
                        {agent.token ? ` · token ${agent.token.symbol}${agent.token.isDemo ? " (sample)" : ""}` : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <header className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">Token desk</h2>
            <Link href="/tokens" className="text-sm text-cyan">All tokens</Link>
          </header>
          {tokens.length === 0 ? <EmptyState title="No tokens stored" body="Confirmed launches appear here after an on-chain transaction is verified." /> : (
            <div className="panel table-wrap">
              <table className="data">
                <thead><tr><th>Token</th><th>Status</th><th>Creator</th></tr></thead>
                <tbody>
                  {tokens.slice(0, 5).map((token) => (
                    <tr key={token.mintAddress}>
                      <td>
                        <Link href={`/token/${token.mintAddress}`} className="font-medium">{token.name}</Link>
                        <div className="font-mono text-xs text-paper-faint">{token.symbol} · {shortAddress(token.mintAddress, 5)}</div>
                        {token.isDemo ? <Badge tone="warn">Sample</Badge> : null}
                      </td>
                      <td className="text-sm">{token.isDemo ? "Not on-chain" : token.status}</td>
                      <td className="font-mono text-xs">{token.creatorAddress ? shortAddress(token.creatorAddress) : "—"}<div className="text-paper-faint">{token.creatorSource}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-3 py-2 text-xs text-paper-faint">Market cap, liquidity, and price are shown on a token page only when a source returns them. AI summaries are labeled separately.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid-2">
        <div className="panel p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Intelligence index</h2>
            <Link href="/intelligence" className="text-sm text-cyan">Open index</Link>
          </div>
          <p className="mt-1 text-xs text-paper-faint">Freshness: {index.freshness ? ageLabel(index.freshness) : "no rows"}</p>
          <div className="mt-3 grid gap-2">
            {index.items.length === 0 ? <p className="text-sm text-paper-dim">No index rows yet.</p> : null}
            {index.items.map((item) => (
              <Link key={item.id} href={`/intelligence/${item.id}`} className="rounded-xl border border-white/5 px-3 py-2 hover:border-cyan/30">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{item.name}</span>
                  <Badge>{item.sourceType}</Badge>
                  {item.isDemo ? <Badge tone="warn">Sample</Badge> : <Badge tone="ok">{item.verificationStatus}</Badge>}
                </div>
                <p className="text-xs text-paper-faint">{item.categories.join(" · ") || "Uncategorized"}</p>
              </Link>
            ))}
          </div>
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Activity</h2>
            <Link href="/activity" className="text-sm text-cyan">Live feed</Link>
          </div>
          <div className="mt-3 grid gap-3">
            {activity.length === 0 ? <p className="text-sm text-paper-dim">No events recorded.</p> : null}
            {activity.map((item) => (
              <article key={item.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={item.sourceKind === "onchain" ? "ok" : item.sourceKind === "ai" ? "violet" : "default"}>{item.sourceKind}</Badge>
                  {item.isDemo ? <Badge tone="warn">Sample</Badge> : null}
                  <span className="text-xs text-paper-faint">{ageLabel(item.createdAt)}</span>
                </div>
                <h3 className="mt-1 text-sm">{item.title}</h3>
                <p className="text-xs text-paper-dim">{item.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">How it works</h2>
        <ol className="mt-3 grid gap-2 md:grid-cols-2">
          {STEPS.map((step, index) => (
            <li key={step} className="panel flex gap-3 p-4">
              <span className="font-mono text-cyan">0{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel stat">
      <span className="text-xs uppercase tracking-wide text-paper-faint">{label}</span>
      <b>{formatNumber(value)}</b>
    </div>
  );
}
