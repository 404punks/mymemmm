"use client";

import { useState } from "react";

export function PreviewBox({ handle, disabled }: { handle: string; disabled: boolean }) {
  const [prompt, setPrompt] = useState("Summarize what you can help with.");
  const [result, setResult] = useState<string>("");
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    setResult("");
    try {
      const response = await fetch(`/api/agents/${handle}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok) setResult(data.error || "Preview failed");
      else if (data.status === "unavailable") setResult(data.notice);
      else setResult(`${data.text}\n\n— ${data.provider}/${data.model} · est. $${data.estimatedCostUsd}`);
    } catch {
      setResult("Network error. Retry the preview.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel p-4">
      <h2 className="font-display text-xl">Preview</h2>
      <p className="mt-1 text-xs text-paper-faint">A single user-triggered completion. Nothing runs in the background.</p>
      <textarea className="area mt-3" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
      <button className="btn btn-primary mt-3" disabled={disabled || pending} onClick={() => void run()}>
        {pending ? "Requesting" : "Run preview"}
      </button>
      {disabled ? <p className="mt-2 text-xs text-warn">Paused or unconfigured assistants do not call a model.</p> : null}
      {result ? <pre className="mt-3 whitespace-pre-wrap text-sm text-paper-dim">{result}</pre> : null}
    </section>
  );
}
