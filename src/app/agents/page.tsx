import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { listPublishedAgents } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "AI Agents" };

export default async function AgentsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const agents = await listPublishedAgents(category);
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">AI agents</h1>
          <p className="mt-1 max-w-2xl text-sm text-paper-dim">Profiles are user-operated assistants. NEURALPAD does not run them on a schedule and does not call them autonomous.</p>
        </div>
        <Link href="/agents/new" className="btn btn-primary">Create agent</Link>
      </header>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="btn btn-ghost" href="/agents">All</Link>
        {["research", "markets", "memes", "discovery", "indexing", "drafting"].map((item) => (
          <Link key={item} className="btn btn-ghost" href={`/agents?category=${item}`}>{item}</Link>
        ))}
      </div>
      {agents.length === 0 ? <EmptyState title="No agents in this view" body="Publish a profile or clear the category filter." /> : (
        <div className="grid-cards">
          {agents.map((agent) => (
            <Link key={agent.handle} href={`/agents/${agent.handle}`} className="panel p-4 hover:border-cyan/40">
              <div className="flex gap-3">
                <img alt="" src={`/avatar/${agent.avatarSeed}`} className="h-14 w-14 rounded-2xl" />
                <div>
                  <h2 className="text-lg">{agent.name}</h2>
                  <p className="text-sm text-paper-faint">@{agent.handle}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-paper-dim">{agent.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {agent.isDemo ? <Badge tone="warn">Sample</Badge> : null}
                <Badge tone={agent.status === "active" ? "ok" : "default"}>{agent.status}</Badge>
                {agent.skills.map((skill) => <Badge key={skill} tone="cyan">{skill}</Badge>)}
              </div>
              <p className="mt-3 text-xs text-paper-faint">
                {agent.modelId ? `${agent.providerId}/${agent.modelId}` : "No verified model"} · {agent.latestActivity ? agent.latestActivity.summary : "No activity yet"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
