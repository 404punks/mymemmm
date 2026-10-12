"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "./ui";

type Candidate = { name: string; symbol: string; description: string; lore: string; utility: string };

export function IdeaStudio() {
  const [concept, setConcept] = useState("");
  const [tone, setTone] = useState("");
  const [notice, setNotice] = useState("");
  const [source, setSource] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [research, setResearch] = useState("");

  async function generate() {
    setPending(true);
    setError("");
    const response = await fetch("/api/ai/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept, tone }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Draft failed");
      return;
    }
    setNotice(data.notice || "");
    setSource(data.outputSource || "");
    const parsed = data.parsed ?? data;
    setCandidates(parsed.candidates || data.candidates || []);
    setPrompts(parsed.imagePrompts || data.imagePrompts || []);
    setAnnouncement(parsed.announcement || data.announcement || "");
  }

  async function researchIt() {
    const response = await fetch("/api/ai/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: concept }),
    });
    const data = await response.json();
    if (!response.ok) {
      setResearch(data.error || "Research failed");
      return;
    }
    const summary = data.parsed?.summary || data.summary || data.notice;
    const cites = (data.citations || []).map((item: { name: string; sourceUrl: string; isDemo: boolean }) => `${item.name} — ${item.sourceUrl}${item.isDemo ? " (sample)" : ""}`).join("\n");
    setResearch(`${data.notice}\n\n${summary || "No summary."}\n\n${cites}`);
  }

  function update(index: number, key: keyof Candidate, value: string) {
    setCandidates((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  return (
    <div className="space-y-4">
      <form className="panel grid gap-3 p-4" onSubmit={(event) => { event.preventDefault(); void generate(); }}>
        <textarea className="area" placeholder="A meme, narrative, agent, or concept" value={concept} onChange={(event) => setConcept(event.target.value)} />
        <input className="field" placeholder="Optional tone" value={tone} onChange={(event) => setTone(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={pending || concept.trim().length < 8}>{pending ? "Drafting" : "Draft candidates"}</button>
          <button className="btn btn-ghost" type="button" disabled={concept.trim().length < 3} onClick={() => void researchIt()}>Research the index</button>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {notice ? <p className="text-sm text-paper-dim"><Badge tone={source === "model" ? "violet" : "warn"}>{source || "draft"}</Badge> {notice}</p> : null}
      </form>
      {candidates.map((candidate, index) => (
        <article key={`${candidate.symbol}-${index}`} className="panel grid gap-2 p-4">
          <div className="grid gap-2 md:grid-cols-2">
            <input className="field" value={candidate.name} onChange={(event) => update(index, "name", event.target.value)} />
            <input className="field" value={candidate.symbol} onChange={(event) => update(index, "symbol", event.target.value)} />
          </div>
          <textarea className="area" value={candidate.description} onChange={(event) => update(index, "description", event.target.value)} />
          <textarea className="area" value={candidate.lore} onChange={(event) => update(index, "lore", event.target.value)} />
          <textarea className="area" value={candidate.utility} onChange={(event) => update(index, "utility", event.target.value)} />
          <Link className="btn btn-ghost w-fit" href={`/launch?name=${encodeURIComponent(candidate.name)}&symbol=${encodeURIComponent(candidate.symbol)}`}>Use in launch form</Link>
        </article>
      ))}
      {prompts.length > 0 ? (
        <section className="panel p-4 text-sm">
          <h2 className="font-display text-xl">Image prompts</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-paper-dim">{prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul>
        </section>
      ) : null}
      {announcement ? (
        <section className="panel p-4">
          <h2 className="font-display text-xl">Announcement draft</h2>
          <textarea className="area mt-2" value={announcement} onChange={(event) => setAnnouncement(event.target.value)} />
        </section>
      ) : null}
      {research ? <pre className="panel whitespace-pre-wrap p-4 text-sm text-paper-dim">{research}</pre> : null}
    </div>
  );
}
