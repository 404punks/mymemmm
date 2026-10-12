"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState, Skeleton } from "./ui";
import { ageLabel, explorerTx, shortAddress } from "@/lib/format";

type Item = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  sourceKind: "onchain" | "ai" | "system";
  href: string | null;
  signature: string | null;
  isDemo: boolean;
  createdAt: string;
};

const KINDS = ["", "token_created", "trade", "agent_published", "ai_analysis", "index_update", "job_failed", "job_retry"];

export function ActivityFeed() {
  const [kind, setKind] = useState("");
  const [source, setSource] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load(reset: boolean, next?: string | null) {
    setState("loading");
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    if (source) params.set("source", source);
    if (!reset && next) params.set("cursor", next);
    try {
      const response = await fetch(`/api/activity?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "failed");
      setItems((current) => (reset ? data.items : [...current, ...data.items]));
      setCursor(data.nextCursor);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void load(true);
    const timer = window.setInterval(() => void load(true), 20000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, source]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select className="select max-w-xs" value={kind} onChange={(event) => setKind(event.target.value)}>
          {KINDS.map((item) => <option key={item || "all"} value={item}>{item || "All kinds"}</option>)}
        </select>
        <select className="select max-w-xs" value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="">All sources</option>
          <option value="onchain">On-chain</option>
          <option value="ai">AI</option>
          <option value="system">System</option>
        </select>
      </div>
      {state === "loading" && items.length === 0 ? <Skeleton className="h-40" /> : null}
      {state === "error" ? <EmptyState title="Activity feed failed" body="The events API did not respond." action={<button className="btn btn-ghost" onClick={() => void load(true)}>Retry</button>} /> : null}
      {state === "ready" && items.length === 0 ? <EmptyState title="No events" body="Confirmed actions will appear here. Sample events show up after seeding." /> : null}
      <ol className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={item.sourceKind === "onchain" ? "ok" : item.sourceKind === "ai" ? "violet" : "default"}>{item.sourceKind}</Badge>
              <Badge>{item.kind}</Badge>
              {item.isDemo ? <Badge tone="warn">Sample</Badge> : null}
              <span className="text-xs text-paper-faint">{ageLabel(item.createdAt)}</span>
            </div>
            <h2 className="mt-2">{item.title}</h2>
            <p className="text-sm text-paper-dim">{item.summary}</p>
            <div className="mt-2 flex gap-3 text-sm">
              {item.href ? <Link className="text-cyan" href={item.href}>Open</Link> : null}
              {item.signature ? <a className="text-cyan" href={explorerTx(item.signature, "devnet")}>{shortAddress(item.signature)}</a> : null}
            </div>
          </li>
        ))}
      </ol>
      {cursor ? <button className="btn btn-ghost" onClick={() => void load(false, cursor)}>Older events</button> : null}
    </div>
  );
}
