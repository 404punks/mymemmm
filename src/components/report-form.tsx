"use client";

import { useState } from "react";

export function ReportForm({ id, count }: { id: string; count: number }) {
  const [note, setNote] = useState("");
  async function submit(formData: FormData) {
    const response = await fetch(`/api/index/${id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: formData.get("reason"), details: formData.get("details") }),
    });
    const data = await response.json();
    setNote(response.ok ? "Report stored. The record stays visible until a reviewer checks it." : data.error || "Report failed");
  }
  return (
    <form className="panel grid max-w-xl gap-2 p-4" action={(formData) => void submit(formData)}>
      <h2 className="font-display text-xl">Report this record</h2>
      <p className="text-xs text-paper-faint">{count} report{count === 1 ? "" : "s"} on file.</p>
      <select className="select" name="reason" defaultValue="incorrect">
        <option value="incorrect">Incorrect</option>
        <option value="duplicate">Duplicate</option>
        <option value="private-data">Private data</option>
        <option value="spam">Spam</option>
        <option value="other">Other</option>
      </select>
      <textarea className="area" name="details" required minLength={8} placeholder="What is wrong? Do not include private data." />
      <button className="btn btn-ghost w-fit" type="submit">Submit report</button>
      {note ? <p className="text-sm text-paper-dim">{note}</p> : null}
    </form>
  );
}
