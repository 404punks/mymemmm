import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { splitList } from "@/lib/lists";
import { ageLabel, formatWhen } from "@/lib/format";
import { PreviewBox } from "@/components/preview-box";

export const dynamic = "force-dynamic";

export default async function AgentProfile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const agent = await prisma.agent.findUnique({
    where: { handle },
    include: { tokens: true, activities: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  if (!agent || !agent.published) notFound();
  const skills = splitList(agent.skills);
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap gap-4">
        <img alt="" src={`/avatar/${agent.avatarSeed}`} className="h-20 w-20 rounded-3xl" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl">{agent.name}</h1>
            {agent.isDemo ? <Badge tone="warn">Sample profile</Badge> : null}
            <Badge tone={agent.status === "active" ? "ok" : agent.status === "unavailable" ? "danger" : "default"}>{agent.status}</Badge>
          </div>
          <p className="text-paper-dim">@{agent.handle} · {agent.category} · {agent.personality}</p>
          <p className="mt-2 max-w-2xl text-sm">{agent.description}</p>
        </div>
      </header>
      <div className="grid-2">
        <section className="panel p-4">
          <h2 className="font-display text-xl">Capabilities</h2>
          <div className="mt-3 flex flex-wrap gap-2">{skills.map((skill) => <Badge key={skill} tone="cyan">{skill}</Badge>)}</div>
          <dl className="mt-4 grid gap-2 text-sm">
            <div><dt className="text-paper-faint">Operation</dt><dd>User-operated assistant. Not an autonomous agent.</dd></div>
            <div><dt className="text-paper-faint">Model</dt><dd>{agent.providerId && agent.modelId ? `${agent.providerId} / ${agent.modelId}` : "Not configured — previews stay unavailable."}</dd></div>
            <div><dt className="text-paper-faint">Daily limit</dt><dd>{agent.dailyLimit} model calls</dd></div>
            <div><dt className="text-paper-faint">Usage count</dt><dd>{agent.usageCount}</dd></div>
            <div><dt className="text-paper-faint">Last active</dt><dd>{agent.lastActiveAt ? formatWhen(agent.lastActiveAt) : "No completed model call"}</dd></div>
            <div><dt className="text-paper-faint">Source</dt><dd>{agent.sourceUrl ? <a className="text-cyan" href={agent.sourceUrl}>{agent.sourceUrl}</a> : "Profile authored in NEURALPAD"}</dd></div>
          </dl>
          <h3 className="mt-4 text-sm text-paper-faint">Public system instructions</h3>
          <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-ink-950 p-3 font-mono text-xs text-paper-dim">{agent.systemPrompt}</pre>
        </section>
        <div className="space-y-3">
          <PreviewBox handle={agent.handle} disabled={agent.status !== "active"} />
          <section className="panel p-4">
            <h2 className="font-display text-xl">Associated tokens</h2>
            {agent.tokens.length === 0 ? <p className="mt-2 text-sm text-paper-dim">No token is linked.</p> : agent.tokens.map((token) => (
              <Link key={token.id} href={`/token/${token.mintAddress}`} className="mt-2 block text-sm text-cyan">
                {token.name} ({token.symbol}) {token.isDemo ? "· sample" : `· ${token.status}`}
              </Link>
            ))}
            <Link href={`/launch?agent=${agent.handle}`} className="btn btn-ghost mt-3">Start a token launch</Link>
          </section>
        </div>
      </div>
      <section className="panel p-4">
        <h2 className="font-display text-xl">Activity</h2>
        {agent.activities.length === 0 ? <p className="mt-2 text-sm text-paper-dim">No recorded actions.</p> : (
          <ul className="mt-3 space-y-3">
            {agent.activities.map((item) => (
              <li key={item.id} className="text-sm">
                <Badge>{item.channel}</Badge> <span className="ml-2">{item.summary}</span>
                <span className="ml-2 text-xs text-paper-faint">{ageLabel(item.createdAt)} · {item.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
