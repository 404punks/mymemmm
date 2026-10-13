"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";

export function TradePanel({ mint, pool }: { mint: string; pool: string | null }) {
  const wallet = useWallet();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.01");
  const [unit, setUnit] = useState<"sol" | "token">("sol");
  const [slippage, setSlippage] = useState(10);
  const [priorityFee, setPriorityFee] = useState(0.00005);
  const [quote, setQuote] = useState<string>("");
  const [status, setStatus] = useState("No transaction has been sent.");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [trades, setTrades] = useState<string[]>([]);

  useEffect(() => {
    const source = new EventSource(`/api/live?mint=${mint}`);
    source.addEventListener("trade", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { txType?: string; solAmount?: number; signature?: string };
      const line = [data.txType, data.solAmount != null ? `${data.solAmount} SOL` : null, data.signature ? data.signature.slice(0, 8) : null].filter(Boolean).join(" · ");
      if (line) setTrades((current) => [line, ...current].slice(0, 8));
    });
    source.addEventListener("error", (event) => {
      if (!("data" in event) || typeof (event as MessageEvent).data !== "string") return;
      try {
        const data = JSON.parse((event as MessageEvent).data) as { message?: string };
        if (data.message) setError(data.message);
      } catch {
        setError("The live feed closed.");
      }
    });
    return () => source.close();
  }, [mint]);

  async function requestQuote() {
    if (!wallet.publicKey) { setError("Connect a wallet before quoting. The quote reads your accounts."); return; }
    setPending(true); setError("");
    try {
      const response = await fetch("/api/solana/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint, user: wallet.publicKey.toBase58(), side, amount, denominatedInSol: unit === "sol", slippage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Quote failed");
      if (data.note && !data.tokensOut && !data.quoteOut) { setQuote(data.note); return; }
      const raw = side === "buy" ? data.tokensOut : data.quoteOut;
      setQuote(raw ? `${side === "buy" ? "Tokens out" : "Lamports out"} ${raw}. Venue ${data.venue}. This is the on-chain quote, not a promise of fill.` : "The quote did not include an output amount.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
    } finally { setPending(false); }
  }

  async function trade() {
    if (!wallet.publicKey || !wallet.signTransaction) { setError("Connect a wallet that can sign."); return; }
    setPending(true); setError("");
    try {
      const response = await fetch("/api/trade/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicKey: wallet.publicKey.toBase58(),
          mint,
          action: side,
          amount: unit === "sol" || side === "buy" ? Number(amount) : Number(amount),
          denominatedInSol: unit === "sol",
          slippage,
          priorityFee,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not build the trade");
      const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(data.transaction), (char) => char.charCodeAt(0)));
      let signed: VersionedTransaction;
      try { signed = await wallet.signTransaction(tx); }
      catch { throw new Error("The wallet rejected the signature. Nothing was sent."); }
      const bytes = signed.serialize();
      let binary = "";
      for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      const transaction = btoa(binary);
      const sent = await fetch("/api/solana/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transaction }) });
      const result = await sent.json();
      if (!sent.ok) throw new Error(result.error || "Send failed");
      setStatus(`Confirmed ${result.signature}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade failed");
      setStatus("The trade was not confirmed.");
    } finally { setPending(false); }
  }

  return (
    <section className="panel" style={{ padding: 16 }}>
      <h2 style={{ fontFamily: "var(--font-display), serif", marginTop: 0 }}>Trade</h2>
      <p className="muted">Pool {pool || "unread"}. You sign in the wallet. VEIL adds no fee.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button className={side === "buy" ? "btn btn-gold" : "btn"} onClick={() => setSide("buy")}>Buy</button>
        <button className={side === "sell" ? "btn btn-gold" : "btn"} onClick={() => { setSide("sell"); setUnit("token"); }}>Sell</button>
      </div>
      <label>Amount<input className="field" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
      <label>Unit
        <select className="select" value={unit} onChange={(event) => setUnit(event.target.value as "sol" | "token")}>
          <option value="sol">SOL</option>
          <option value="token">Tokens</option>
        </select>
      </label>
      <label>Slippage %<input className="field" type="number" min={0} max={50} value={slippage} onChange={(event) => setSlippage(Number(event.target.value))} /></label>
      <label>Priority fee SOL<input className="field" type="number" min={0} step="0.00001" value={priorityFee} onChange={(event) => setPriorityFee(Number(event.target.value))} /></label>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn" disabled={pending} onClick={() => void requestQuote()}>Quote</button>
        <button className="btn btn-gold" disabled={pending} onClick={() => void trade()}>{pending ? "Working" : "Sign trade"}</button>
      </div>
      {quote ? <p role="status">{quote}</p> : null}
      <p className="status" role="status">{status}</p>
      {error ? <p className="rose" role="alert">{error}</p> : null}
      <h3>Live trades</h3>
      {trades.length === 0 ? <p className="muted">Waiting for PumpPortal.</p> : <ul>{trades.map((tradeItem) => <li key={tradeItem}>{tradeItem}</li>)}</ul>}
    </section>
  );
}
