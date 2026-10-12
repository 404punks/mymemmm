"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Profile = {
  walletAddress: string;
  launched: { mint: string; name: string; symbol: string; imageUrl: string }[];
  holdings: { mint: string; name: string; symbol: string; imageUrl: string; balance: string | null; unlocked: number[]; error?: string }[];
};

export default function ProfilePage() {
  const [data, setData] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/profile").then(async (res) => {
      const body = await res.json();
      if (!res.ok) { setError(body.error || "Profile unavailable"); return; }
      setData(body);
    });
  }, []);
  return (
    <div className="page">
      <h1 style={{ fontFamily: "var(--font-display), serif", fontSize: 48 }}>Profile</h1>
      {error ? <p className="rose" role="alert">{error} <Link href="/launch">Sign in from the header, then return.</Link></p> : null}
      {!data && !error ? <div className="skeleton" style={{ height: 160 }} aria-label="Loading profile" /> : null}
      {data ? (
        <>
          <p className="muted">{data.walletAddress}</p>
          <h2>Launches</h2>
          {data.launched.length === 0 ? <p>You have not confirmed a VEIL launch. <Link className="btn btn-gold" href="/launch">Launch a coin</Link></p> : (
            <ul>{data.launched.map((token) => <li key={token.mint}><Link href={`/token/${token.mint}`}>{token.name} {token.symbol}</Link></li>)}</ul>
          )}
          <h2>Holdings</h2>
          {data.holdings.length === 0 ? <p className="muted">No VEIL coin balance was found for this wallet.</p> : (
            <ul>{data.holdings.map((token) => <li key={token.mint}>{token.name}: {token.error || `${token.balance} tokens, chapters ${token.unlocked.join(", ") || "none"}`}</li>)}</ul>
          )}
        </>
      ) : null}
    </div>
  );
}
