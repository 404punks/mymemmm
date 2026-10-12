"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, EmptyState, Skeleton } from "./ui";
import { ageLabel } from "@/lib/format";
import { SOURCE_TYPES, SOURCE_LABELS, CATEGORIES, SKILLS } from "@/lib/constants";

type Row = {
  id: string;
  name: string;
  description: string;
  sourceType: string;
  sourceUrl: string;
  verificationStatus: string;
  isDemo: boolean;
  lastCheckedAt: string;
  modelProvider: string | null;
  onchainAddress: string | null;
  categories: string[];
};

export function IndexBrowser() {
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [capability, setCapability] = useState("");
  const [provider, setProvider] = useState("");
  const [hasToken, setHasToken] = useState("");
  const [items, setItems] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [freshness, setFreshness] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [jobNote, setJobNote] = useState("");

  async function load(reset: boolean, nextCursor?: string | null) {
    setState("loading");
    const params = new URLSearchParams({ q, source, category, capability, provider, hasToken });
    if (!reset && nextCursor) params.set("cursor", nextCursor);
    try {
      const response = await fetch(`/api/index?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Index request failed");
      setItems((current) => (reset ? data.items : [...current, ...data.items]));
      setCursor(data.nextCursor);
      setFreshness(data.freshness?.lastCheckedAt ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, source, category, capability, provider, hasToken]);

  async function runJob(name: string) {
    setJobNote("Starting…");
    const response = await fetch("/api/index/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: name }),
    });
    const data = await response.json();
    setJobNote(response.ok ? `${name}: ${data.itemsAdded} added, ${data.itemsUpdated} updated` : data.error || "Job failed");
    if (response.ok) void load(true);
  }

  return (
    <div className="space-y-4">
      <div className="panel grid gap-3 p-4 md:grid-cols-3">
        <input className="field md:col-span-3" placeholder="Search indexed names and descriptions" value={q} onChange={(event) => setQ(event.target.value)} />
        <select className="select" value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="">All sources</option>
          {SOURCE_TYPES.map((item) => <option key={item} value={item}>{SOURCE_LABELS[item]}</option>)}
        </select>
        <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="select" value={capability} onChange={(event) => setCapability(event.target.value)}>
          <option value="">All capabilities</option>
          {SKILLS.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input className="field" placeholder="Model provider" value={provider} onChange={(event) => setProvider(event.target.value)} />
        <select className="select" value={hasToken} onChange={(event) => setHasToken(event.target.value)}>
          <option value="">Token link: any</option>
          <option value="yes">Associated address</option>
          <option value="no">No address</option>
        </select>
        <p className="text-xs text-paper-faint self-center">Index freshness: {freshness ? ageLabel(freshness) : "unknown"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["huggingface", "github", "mcp"] as const).map((name) => (
          <button key={name} className="btn btn-ghost" onClick={() => void runJob(name)}>Index {name}</button>
        ))}
        {jobNote ? <span className="text-xs text-paper-dim">{jobNote}</span> : null}
      </div>
      {state === "loading" && items.length === 0 ? <Skeleton className="h-40" /> : null}
      {state === "error" ? <EmptyState title="Index request failed" body="Retry the filters. If the database is down, run prisma db push." action={<button className="btn btn-ghost" onClick={() => void load(true)}>Retry</button>} /> : null}
      {state !== "error" && items.length === 0 && state === "ready" ? <EmptyState title="No matching records" body="Run an index job or widen the filters. Sample rows only appear after seeding." /> : null}
      <div className="grid gap-2">
        {items.map((item) => (
          <Link key={item.id} href={`/intelligence/${item.id}`} className="panel block p-4 hover:border-cyan/30">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base">{item.name}</h2>
              <Badge>{item.sourceType}</Badge>
              {item.isDemo ? <Badge tone="warn">Sample</Badge> : <Badge tone="ok">{item.verificationStatus}</Badge>}
              {item.onchainAddress ? <Badge tone="cyan">on-chain</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-paper-dim">{item.description}</p>
            <p className="mt-1 text-xs text-paper-faint">Checked {ageLabel(item.lastCheckedAt)}{item.modelProvider ? ` · ${item.modelProvider}` : ""}</p>
          </Link>
        ))}
      </div>
      {cursor ? <button className="btn btn-ghost" onClick={() => void load(false, cursor)}>Load more</button> : null}
      <SubmitForm onDone={() => void load(true)} />
    </div>
  );
}

function SubmitForm({ onDone }: { onDone: () => void }) {
  const [note, setNote] = useState("");
  async function submit(formData: FormData) {
    const response = await fetch("/api/index/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description"),
        sourceUrl: formData.get("sourceUrl"),
        sourceType: "user-agent",
        categories: ["research"],
        capabilities: ["research"],
      }),
    });
    const data = await response.json();
    setNote(response.ok ? "Submission stored as user-submitted." : data.error || "Could not submit");
    if (response.ok) onDone();
  }
  return (
    <form className="panel grid gap-2 p-4" action={(formData) => void submit(formData)}>
      <h2 className="font-display text-xl">Submit a public profile</h2>
      <input className="field" name="name" placeholder="Name" required />
      <input className="field" name="sourceUrl" placeholder="https:// public URL" required />
      <textarea className="area" name="description" placeholder="What is public about this system?" required />
      <button className="btn btn-ghost w-fit" type="submit">Submit for the index</button>
      {note ? <p className="text-xs text-paper-dim">{note}</p> : null}
    </form>
  );
}
