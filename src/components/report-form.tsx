"use client";

import { useState } from "react";

export function ReportForm({ mint }: { mint: string }) {
  const [reason, setReason] = useState("impersonation");
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState("");
  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      const response = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mint, reason, detail }) });
      const data = await response.json();
      setStatus(response.ok ? "Report received." : data.error || "Report failed");
    }}>
      <h3>Report this coin</h3>
      <select className="select" value={reason} onChange={(event) => setReason(event.target.value)} aria-label="Report reason">
        <option value="impersonation">Impersonation</option>
        <option value="hate">Hate</option>
        <option value="sexual">Sexual content</option>
        <option value="scam">Scam</option>
        <option value="other">Other</option>
      </select>
      <textarea className="area" value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="What is wrong?" aria-label="Report detail" />
      <button className="btn" type="submit">Submit report</button>
      <p role="status">{status}</p>
    </form>
  );
}
