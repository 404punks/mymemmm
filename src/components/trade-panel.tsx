"use client";

import { useEffect, useState } from "react";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useNetwork } from "./providers";
import { baseUnitsToUi, explorerAddress, explorerTx, lamportsToSol, shortAddress } from "@/lib/format";
import { Badge, EmptyState, Skeleton } from "./ui";

type Payload = {
  record: {
    name: string;
    symbol: string;
    description: string;
    imageUrl: string | null;
    status: string;
    isDemo: boolean;
    network: string;
    creatorAddress: string | null;
    creatorSource: string;
    signature: string | null;
    metadataUri: string | null;
    aiSummary: string | null;
    observations: { source: string; priceUsd: string | null; marketCapUsd: string | null; volumeUsd: string | null; liquidityUsd: string | null; observedAt: string; note: string | null }[];
    trades: { signature: string; side: string; status: string; isDemo: boolean; createdAt: string }[];
    agent: { handle: string; name: string; isDemo: boolean } | null;
  } | null;
  chain: Record<string, unknown> | null;
  market: { available?: boolean; reason?: string; priceUsd?: string | null; marketCapUsd?: number | null; volumeUsd24h?: number | null; liquidityUsd?: number | null; priceChangeH24?: number | null; url?: string | null; fetchedAt?: string; source?: string } | null;
  holders: { available?: boolean; accounts?: { address: string; amount: string }[]; topAccountsSharePercent?: string | null; note?: string; reason?: string } | null;
};

export function TokenScreen({ mint }: { mint: string }) {
  const { network } = useNetwork();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tokens/${mint}?network=${network}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Token request failed");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mint, network]);

  if (loading && !data) return <Skeleton className="h-80" />;
  if (error) return <EmptyState title="Could not load this token" body={error} action={<button className="btn btn-ghost" onClick={() => void load()}>Retry</button>} />;
  if (!data?.record && data?.chain && (data.chain as { found?: boolean }).found === false && !data.record) {
    return <EmptyState title="No token record or bonding curve" body="This address is not in NEURALPAD and the selected network has no Pump bonding curve for it." />;
  }

  const record = data?.record;
  const chain = data?.chain as {
    found?: boolean;
    venue?: string | null;
    complete?: boolean;
    creator?: string;
    creatorSource?: string;
    virtualQuoteReserves?: string;
    virtualTokenReserves?: string;
    realQuoteReserves?: string;
    tokenTotalSupply?: string;
    marketCapQuoteLamports?: string | null;
    marketCapNote?: string;
    bondingCurve?: string;
    pool?: { address: string; accountFound: boolean; status: string; programId: string } | null;
    note?: string;
    fetchedAt?: string;
    isMayhemMode?: boolean;
    isCashbackCoin?: boolean;
    isHolderReward?: boolean;
    error?: string;
  } | null;
  const demo = Boolean(record?.isDemo);
  const name = record?.name || mint;
  const symbol = record?.symbol || "";

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start gap-4">
        {record?.imageUrl ? <img alt="" src={record.imageUrl} className="h-16 w-16 rounded-2xl" /> : <div className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-800 text-xs">No image</div>}
        <div>
          <div className="flex flex-wrap gap-2">
            {demo ? <Badge tone="warn">Sample — not a market</Badge> : null}
            {chain?.complete ? <Badge tone="violet">Bonding curve complete</Badge> : chain?.found ? <Badge tone="cyan">Bonding curve</Badge> : <Badge>Chain unread</Badge>}
            {chain?.pool?.accountFound ? <Badge tone="ok">PumpSwap pool found</Badge> : null}
          </div>
          <h1 className="font-display text-3xl">{name} {symbol ? <span className="text-paper-dim">{symbol}</span> : null}</h1>
          <p className="mt-1 max-w-2xl text-sm text-paper-dim">{record?.description || "No description stored in NEURALPAD."}</p>
        </div>
      </header>

      <section className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <div className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl">Market</h2>
              <button className="btn btn-quiet" onClick={() => void load()}>Refresh</button>
            </div>
            {demo ? <p className="mt-2 text-sm text-paper-dim">Sample records do not include invented prices, volume, or holders.</p> : null}
            {!demo && data?.market?.available ? (
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Price USD" value={data.market.priceUsd ? `$${data.market.priceUsd}` : "—"} />
                <Metric label="Market cap" value={data.market.marketCapUsd != null ? `$${data.market.marketCapUsd.toLocaleString()}` : "—"} />
                <Metric label="Liquidity" value={data.market.liquidityUsd != null ? `$${data.market.liquidityUsd.toLocaleString()}` : "—"} />
                <Metric label="Volume 24h" value={data.market.volumeUsd24h != null ? `$${data.market.volumeUsd24h.toLocaleString()}` : "—"} />
                <Metric label="Change 24h" value={data.market.priceChangeH24 != null ? `${data.market.priceChangeH24}%` : "—"} />
                <Metric label="Source" value={`${data.market.source} · ${data.market.fetchedAt}`} />
              </dl>
            ) : null}
            {!demo && data?.market && data.market.available === false ? <p className="mt-2 text-sm text-paper-dim">{data.market.reason}. No price was substituted.</p> : null}
            {chain?.found && !chain.complete && chain.marketCapQuoteLamports ? (
              <p className="mt-3 text-xs text-paper-faint">Curve quote market cap: {lamportsToSol(chain.marketCapQuoteLamports)} quote units. {chain.marketCapNote}</p>
            ) : null}
            <ObservationChart points={record?.observations ?? []} />
            {chain?.pool ? <p className="mt-3 text-xs text-paper-dim">Pool {shortAddress(chain.pool.address, 6)} · {chain.pool.status}</p> : null}
            {chain?.error ? <p className="mt-2 text-sm text-danger">{chain.error}</p> : null}
            {chain?.note && !chain.found ? <p className="mt-2 text-sm text-paper-dim">{chain.note}</p> : null}
          </div>
          {!demo ? <TradeBox mint={mint} disabled={!chain?.found} /> : null}
        </div>
        <aside className="panel space-y-3 p-4 text-sm">
          <h2 className="font-display text-xl">Identity</h2>
          <CopyRow label="Mint" value={mint} />
          <p>Creator: {chain?.creator || record?.creatorAddress || "Unknown"}</p>
          <p className="text-xs text-paper-faint">Attribution: {chain?.creatorSource || record?.creatorSource || "not verified"}</p>
          {record?.signature ? <a className="text-cyan" href={explorerTx(record.signature, record.network)}>Creation transaction</a> : null}
          <p><a className="text-cyan" href={explorerAddress(mint, network)}>Solscan</a></p>
          {record?.metadataUri ? <p className="break-all text-xs">Metadata {record.metadataUri}</p> : <p className="text-xs text-paper-faint">Metadata URI not stored.</p>}
          {chain?.bondingCurve ? <p className="text-xs">Curve {shortAddress(chain.bondingCurve, 6)}</p> : null}
          {chain?.tokenTotalSupply ? <p className="text-xs">Supply (base units) {chain.tokenTotalSupply}</p> : null}
          {chain?.realQuoteReserves ? <p className="text-xs">Real quote reserves {lamportsToSol(chain.realQuoteReserves)} · virtual quote {chain.virtualQuoteReserves ? lamportsToSol(chain.virtualQuoteReserves) : "—"}</p> : null}
          <div className="flex flex-wrap gap-1">
            {chain?.isMayhemMode ? <Badge tone="warn">Mayhem</Badge> : null}
            {chain?.isCashbackCoin ? <Badge>Cashback coin</Badge> : null}
            {chain?.isHolderReward ? <Badge tone="violet">Holder rewards</Badge> : null}
          </div>
          {record?.agent ? <p>Assistant <a className="text-cyan" href={`/agents/${record.agent.handle}`}>@{record.agent.handle}</a> {record.agent.isDemo ? "(sample)" : ""}</p> : null}
          <p className="text-xs text-paper-faint">Chain read {chain?.fetchedAt || "not loaded"} · network {network}</p>
        </aside>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="font-display text-xl">Holders</h2>
          {demo ? <p className="mt-2 text-sm text-paper-dim">Hidden for sample records.</p> : null}
          {!demo && data?.holders?.available ? (
            <>
              <p className="mt-2 text-xs text-paper-faint">{data.holders.note}</p>
              {data.holders.topAccountsSharePercent ? <p className="mt-2 text-sm">Largest returned accounts hold {data.holders.topAccountsSharePercent}% of supply.</p> : null}
              <ul className="mt-2 space-y-1 font-mono text-xs">
                {(data.holders.accounts ?? []).slice(0, 8).map((account) => (
                  <li key={account.address}>{shortAddress(account.address, 6)} · {account.amount}</li>
                ))}
              </ul>
            </>
          ) : null}
          {!demo && data?.holders && data.holders.available === false ? <p className="mt-2 text-sm text-paper-dim">{data.holders.reason}. Holder concentration is omitted.</p> : null}
        </div>
        <div className="panel p-4">
          <h2 className="font-display text-xl">Trades stored here</h2>
          {(record?.trades.length ?? 0) === 0 ? <p className="mt-2 text-sm text-paper-dim">No trade rows in NEURALPAD for this mint. Chain history is not fabricated.</p> : (
            <ul className="mt-2 space-y-2 text-sm">
              {record?.trades.map((trade) => (
                <li key={trade.signature}>{trade.side} · {trade.status} {trade.isDemo ? "· sample" : ""} · <a className="text-cyan" href={explorerTx(trade.signature, network)}>{shortAddress(trade.signature)}</a></li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Analysis mint={mint} existing={record?.aiSummary} />
      <section className="panel p-4 text-sm text-paper-dim">
        <h2 className="font-display text-xl text-paper">Risk</h2>
        <p className="mt-2">Bonding-curve tokens and migrated pools can lose substantial or all of their value. A model summary is not an audit, a safety rating, or a prediction. Missing metadata is a gap, not a verdict.</p>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-paper-faint">{label}</dt><dd className="break-all">{value}</dd></div>;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <p className="break-all">
      {label}: <span className="font-mono text-xs">{value}</span>
      <button className="btn btn-quiet ml-1" onClick={() => { void navigator.clipboard.writeText(value); setDone(true); }}>{done ? "Copied" : "Copy"}</button>
    </p>
  );
}

function ObservationChart({ points }: { points: { priceUsd: string | null; observedAt: string; source: string }[] }) {
  const series = points.filter((point) => point.priceUsd && Number(point.priceUsd) > 0).slice().reverse();
  if (series.length < 2) {
    return <p className="mt-4 text-sm text-paper-dim">{series.length === 1 ? `One observation: $${series[0].priceUsd} from ${series[0].source}. A chart needs at least two stored points.` : "No historical candles are stored. NEURALPAD only charts prices it has actually observed."}</p>;
  }
  const values = series.map((point) => Number(point.priceUsd));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const path = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 280;
    const y = 80 - ((value - min) / span) * 70;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div className="mt-4">
      <svg viewBox="0 0 280 90" className="h-28 w-full" role="img" aria-label="Observed price points">
        <path d={path} fill="none" stroke="#3ee0ff" strokeWidth="2" />
      </svg>
      <p className="text-xs text-paper-faint">{series.length} Neuralpad observations from {series[0].source}. Not a full market history.</p>
    </div>
  );
}

function TradeBox({ mint, disabled }: { mint: string; disabled: boolean }) {
  const { network } = useNetwork();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.01");
  const [slippage, setSlippage] = useState("1");
  const [quote, setQuote] = useState<string>("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function requestQuote() {
    if (!wallet.publicKey) {
      setQuote("Connect a wallet to quote.");
      return;
    }
    setPending(true);
    const response = await fetch("/api/solana/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network, mint, user: wallet.publicKey.toBase58(), side, amount, slippage: Number(slippage) }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setQuote(data.error || "Quote failed");
      return;
    }
    if (data.note && !data.tokensOut && !data.quoteOut) {
      setQuote(data.note);
      return;
    }
    if (side === "buy") setQuote(`${baseUnitsToUi(data.tokensOut || "0")} tokens via ${data.instruction}. Venue ${data.venue}.`);
    else setQuote(`${lamportsToSol(data.quoteOut || "0")} quote units via ${data.instruction}. Venue ${data.venue}.`);
  }

  async function trade() {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setStatus("Connect a wallet that can sign.");
      return;
    }
    setPending(true);
    setStatus("Building an unsigned transaction…");
    try {
      const response = await fetch("/api/solana/build-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network, mint, user: wallet.publicKey.toBase58(), side, amount, slippage: Number(slippage) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Build failed");
      const raw = Uint8Array.from(atob(data.serialized), (char) => char.charCodeAt(0));
      const tx = Transaction.from(raw);
      setStatus("Waiting for your wallet signature…");
      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      setStatus("Submitted. Confirming…");
      await connection.confirmTransaction({ signature: sig, blockhash: data.blockhash, lastValidBlockHeight: data.lastValidBlockHeight }, "confirmed");
      setStatus(`Confirmed ${sig}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Trade failed. Nothing was marked successful.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel p-4">
      <div className="flex gap-2">
        <button className={side === "buy" ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setSide("buy")}>Buy</button>
        <button className={side === "sell" ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setSide("sell")}>Sell</button>
      </div>
      <label className="mt-3 block text-sm">{side === "buy" ? "SOL to spend" : "Tokens to sell"}
        <input className="field mt-1" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
      </label>
      <label className="mt-3 block text-sm">Slippage %
        <input className="field mt-1" value={slippage} onChange={(event) => setSlippage(event.target.value)} />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-ghost" disabled={pending || disabled} onClick={() => void requestQuote()}>Quote</button>
        <button className="btn btn-primary" disabled={pending || disabled} onClick={() => void trade()}>{pending ? "Working" : "Sign trade"}</button>
      </div>
      {disabled ? <p className="mt-2 text-xs text-warn">Trading stays disabled until a bonding curve or pool can be read.</p> : null}
      {quote ? <p className="mt-2 text-sm text-paper-dim">{quote}</p> : null}
      {status ? <p className="mt-2 text-sm">{status.startsWith("Confirmed") ? <a className="text-cyan" href={explorerTx(status.replace("Confirmed ", ""), network)}>{shortAddress(status.replace("Confirmed ", ""))}</a> : status}</p> : null}
    </section>
  );
}

function Analysis({ mint, existing }: { mint: string; existing?: string | null }) {
  const { network } = useNetwork();
  const [text, setText] = useState(existing || "");
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    const response = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mint, network }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setText(data.error || "Analysis failed");
      return;
    }
    const summary = data.analysis?.parsed?.summary || data.analysis?.raw || data.analysis?.notice;
    setText(`${data.analysis?.notice || ""}\n\n${summary || "No summary."}\n\nMissing: ${(data.missing || []).join(", ") || "none listed"}`);
  }

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl">Research note</h2>
        <Badge tone="violet">AI</Badge>
      </div>
      <p className="mt-1 text-xs text-paper-faint">Model text is an interpretation of the facts returned above. It is not a price target.</p>
      <button className="btn btn-ghost mt-3" disabled={pending} onClick={() => void run()}>{pending ? "Requesting" : "Generate analysis"}</button>
      {text ? <pre className="mt-3 whitespace-pre-wrap text-sm text-paper-dim">{text}</pre> : <p className="mt-3 text-sm text-paper-dim">No analysis has been generated for this view.</p>}
    </section>
  );
}
