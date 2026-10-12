"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNetwork } from "./providers";
import { Badge, EmptyState, Skeleton } from "./ui";
import { explorerTx, lamportsToSol, shortAddress } from "@/lib/format";

type Payload = {
  authenticated: boolean;
  chain: {
    solLamports: string;
    tokens: { mint: string; uiAmount: string; decimals: number }[];
    signatures: { signature: string; err: string | null; confirmationStatus: string | null }[];
    fetchedAt: string;
  };
  createdTokens: { mintAddress: string; name: string; symbol: string; status: string; isDemo: boolean; network: string; signature: string | null }[];
  agents: { handle: string; name: string; status: string; published: boolean }[];
  activity: { id: string; title: string; summary: string; createdAt: string }[];
};

export function Portfolio() {
  const wallet = useWallet();
  const { network } = useNetwork();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const address = wallet.publicKey?.toBase58();

  async function load() {
    if (!address) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/portfolio?address=${address}&network=${network}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Portfolio failed");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Portfolio failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (address) void load();
    else setData(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, network]);

  if (!address) return <EmptyState title="Wallet not connected" body="Connect Phantom or Solflare to read a public balance. Disconnecting clears this view." />;
  if (loading && !data) return <Skeleton className="h-64" />;
  if (error) return <EmptyState title="Portfolio unavailable" body={error} action={<button className="btn btn-ghost" onClick={() => void load()}>Retry</button>} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-sm">{address}</p>
            <p className="text-xs text-paper-faint">{data.authenticated ? "Signed-in session matches this wallet" : "Connected only — sign in to manage agents"} · {network} · {data.chain.fetchedAt}</p>
          </div>
          <button className="btn btn-ghost" onClick={() => void load()}>Refresh</button>
        </div>
        <p className="mt-3 font-display text-3xl">{lamportsToSol(data.chain.solLamports)} SOL</p>
      </section>
      <section className="panel p-4">
        <h2 className="font-display text-xl">Token balances</h2>
        {data.chain.tokens.length === 0 ? <p className="mt-2 text-sm text-paper-dim">No non-zero token accounts returned for this owner.</p> : (
          <ul className="mt-2 space-y-2 text-sm">
            {data.chain.tokens.slice(0, 20).map((token) => (
              <li key={token.mint}><Link className="text-cyan" href={`/token/${token.mint}`}>{shortAddress(token.mint, 6)}</Link> · {token.uiAmount}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="grid gap-3 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="font-display text-xl">Created in NEURALPAD</h2>
          {data.createdTokens.length === 0 ? <p className="mt-2 text-sm text-paper-dim">No verified launches list this wallet as creator.</p> : data.createdTokens.map((token) => (
            <p key={token.mintAddress} className="mt-2 text-sm">
              <Link className="text-cyan" href={`/token/${token.mintAddress}`}>{token.name} ({token.symbol})</Link>
              <Badge>{token.status}</Badge>
              {token.signature ? <a className="ml-2 text-xs text-cyan" href={explorerTx(token.signature, token.network)}>tx</a> : null}
            </p>
          ))}
        </div>
        <div className="panel p-4">
          <h2 className="font-display text-xl">Assistants</h2>
          {!data.authenticated ? <p className="mt-2 text-sm text-paper-dim">Sign in with this wallet to load profiles you own.</p> : null}
          {data.authenticated && data.agents.length === 0 ? <p className="mt-2 text-sm text-paper-dim">No profiles saved for this session.</p> : null}
          {data.agents.map((agent) => (
            <p key={agent.handle} className="mt-2 text-sm"><Link className="text-cyan" href={`/agents/${agent.handle}`}>{agent.name}</Link> · {agent.status}</p>
          ))}
        </div>
      </section>
      <section className="panel p-4">
        <h2 className="font-display text-xl">Recent signatures</h2>
        {data.chain.signatures.length === 0 ? <p className="mt-2 text-sm text-paper-dim">The RPC returned no recent signatures.</p> : (
          <ul className="mt-2 space-y-2 text-sm">
            {data.chain.signatures.map((sig) => (
              <li key={sig.signature}>
                <a className="text-cyan" href={explorerTx(sig.signature, network)}>{shortAddress(sig.signature, 8)}</a>
                <span className="ml-2 text-paper-faint">{sig.err ? "failed" : sig.confirmationStatus || "seen"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
