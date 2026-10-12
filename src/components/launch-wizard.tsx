"use client";

import { useEffect, useState } from "react";
import { Keypair, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useNetwork } from "./providers";
import { explorerTx, lamportsToSol, shortAddress } from "@/lib/format";

type Built = {
  serialized: string;
  blockhash: string;
  lastValidBlockHeight: number;
  programId: string;
  accounts: { pubkey: string; signer: boolean; writable: boolean }[];
  simulation: { ok: boolean; err: string | null };
  balanceLamports: string;
  note: string;
};

export function LaunchWizard({
  initialName = "",
  initialSymbol = "",
  agent = "",
}: {
  initialName?: string;
  initialSymbol?: string;
  agent?: string;
}) {
  const { network } = useNetwork();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [mintKeypair, setMintKeypair] = useState<Keypair | null>(null);
  const [name, setName] = useState(initialName);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [description, setDescription] = useState("");
  const [mayhemMode, setMayhemMode] = useState(false);
  const [holderReward, setHolderReward] = useState(false);
  const [imageId, setImageId] = useState<string | null>(null);
  const [bannerId, setBannerId] = useState<string | null>(null);
  const [uri, setUri] = useState("");
  const [built, setBuilt] = useState<Built | null>(null);
  const [status, setStatus] = useState("Draft. Nothing has been sent.");
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    setMintKeypair(Keypair.generate());
  }, []);

  async function upload(file: File, kind: "image" | "banner") {
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/files", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Upload failed");
    if (kind === "image") setImageId(data.id);
    else setBannerId(data.id);
  }

  async function generateMark() {
    setError("");
    const response = await fetch("/api/ai/brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "Draft", symbol: symbol || "DRAFT", concept: description || name || "token concept" }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Brand draft failed");
      return;
    }
    const logoId = String(data.assets.logo).split("/").pop();
    const banner = String(data.assets.banner).split("/").pop();
    setImageId(logoId || null);
    setBannerId(banner || null);
    setStatus(data.notice);
  }

  async function storeMetadata() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          symbol,
          description,
          imageFileId: imageId,
          bannerFileId: bannerId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Metadata failed");
      setUri(data.uri);
      setStatus("Metadata stored. Review the transaction next. The token is not launched.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Metadata failed");
    } finally {
      setPending(false);
    }
  }

  async function prepare() {
    if (!mintKeypair) {
      setError("The mint key is still being created in this browser.");
      return;
    }
    if (!wallet.publicKey) {
      setError("Connect a wallet before building a transaction.");
      return;
    }
    setPending(true);
    setError("");
    setBuilt(null);
    try {
      const response = await fetch("/api/solana/build-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network,
          mint: mintKeypair.publicKey.toBase58(),
          name,
          symbol,
          uri,
          creator: wallet.publicKey.toBase58(),
          user: wallet.publicKey.toBase58(),
          mayhemMode,
          holderReward,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not build the transaction");
      setBuilt(data);
      setStatus("Unsigned transaction ready. Your wallet must approve it. NEURALPAD will not sign for you.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Build failed");
    } finally {
      setPending(false);
    }
  }

  async function signAndSend() {
    if (!built || !mintKeypair || !wallet.publicKey || !wallet.signTransaction) {
      setError("Connect a wallet that can sign transactions.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const raw = Uint8Array.from(atob(built.serialized), (char) => char.charCodeAt(0));
      const tx = Transaction.from(raw);
      tx.partialSign(mintKeypair);
      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      setSignature(sig);
      setStatus("Submitted. Waiting for confirmation before this is called a launch.");
      const confirmation = await connection.confirmTransaction(
        { signature: sig, blockhash: built.blockhash, lastValidBlockHeight: built.lastValidBlockHeight },
        "confirmed",
      );
      if (confirmation.value.err) {
        setStatus("The cluster rejected the transaction. It is not a successful launch.");
        setError(JSON.stringify(confirmation.value.err));
        return;
      }
      const verify = await fetch("/api/solana/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network,
          mint: mintKeypair.publicKey.toBase58(),
          signature: sig,
          name,
          symbol,
          description,
          metadataUri: uri,
          imageUrl: imageId ? `/api/files/${imageId}` : undefined,
          agentHandle: agent || undefined,
        }),
      });
      const verified = await verify.json();
      if (!verified.confirmed) {
        setStatus(verified.reason || "Confirmation could not be verified.");
        return;
      }
      setStatus("Confirmed and verified on-chain.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signing failed");
      setStatus("Transaction was not confirmed. You can rebuild and try again. No token is marked launched.");
    } finally {
      setPending(false);
    }
  }

  async function recheck() {
    if (!signature || !mintKeypair) return;
    setPending(true);
    const verify = await fetch("/api/solana/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        network,
        mint: mintKeypair.publicKey.toBase58(),
        signature,
        name,
        symbol,
        description,
        metadataUri: uri,
        imageUrl: imageId ? `/api/files/${imageId}` : undefined,
        agentHandle: agent || undefined,
      }),
    });
    const verified = await verify.json();
    setPending(false);
    setStatus(verified.confirmed ? "Confirmed and verified on-chain." : verified.reason || verified.error || "Not verified");
  }

  const launched = status.startsWith("Confirmed");

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <form className="panel space-y-3 p-4" onSubmit={(event) => event.preventDefault()}>
        <p className="text-xs uppercase tracking-wide text-cyan">Network · {network}</p>
        <label className="block text-sm">Name<input className="field mt-1" maxLength={32} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="block text-sm">Ticker<input className="field mt-1" maxLength={13} value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} /></label>
        <label className="block text-sm">Description<textarea className="area mt-1" maxLength={400} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label className="block text-sm">Token image
          <input className="mt-1 block text-xs" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file, "image").catch((err) => setError(err.message));
          }} />
        </label>
        <label className="block text-sm">Banner
          <input className="mt-1 block text-xs" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file, "banner").catch((err) => setError(err.message));
          }} />
        </label>
        <button className="btn btn-ghost" type="button" onClick={() => void generateMark()}>Generate local brand concept</button>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mayhemMode} onChange={(event) => setMayhemMode(event.target.checked)} /> Mayhem mode (off unless you explicitly want it)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={holderReward} onChange={(event) => setHolderReward(event.target.checked)} /> Holder rewards coin, if the cluster global account allows it</label>
        <p className="text-xs text-paper-faint">Cashback mode is not offered. The current create instruction rejects new cashback coins.</p>
        {agent ? <p className="text-xs text-paper-dim">Will associate assistant @{agent} after verification.</p> : null}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" disabled={pending || !name || !symbol || !description} onClick={() => void storeMetadata()}>Store metadata</button>
          <button className="btn btn-ghost" disabled={pending || !uri} onClick={() => void prepare()}>Build transaction</button>
          <button className="btn btn-primary" disabled={pending || !built} onClick={() => void signAndSend()}>Approve and sign</button>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </form>
      <aside className="space-y-3">
        <section className="panel p-4 text-sm">
          <h2 className="font-display text-xl">Review</h2>
          <p className="mt-2 text-paper-dim">{status}</p>
          <dl className="mt-3 space-y-2">
            <div><dt className="text-paper-faint">Mint key (generated in this browser)</dt><dd className="break-all font-mono text-xs">{mintKeypair ? mintKeypair.publicKey.toBase58() : "Created locally after this page loads. Nothing is sent until you sign."}</dd></div>
            <div><dt className="text-paper-faint">Metadata URI</dt><dd className="break-all font-mono text-xs">{uri || "Not stored"}</dd></div>
            <div><dt className="text-paper-faint">Wallet SOL</dt><dd>{built ? `${lamportsToSol(built.balanceLamports)} SOL` : wallet.publicKey ? shortAddress(wallet.publicKey.toBase58()) : "Not connected"}</dd></div>
            {imageId ? <img alt="Token mark" src={`/api/files/${imageId}`} className="h-20 w-20 rounded-2xl" /> : null}
          </dl>
          {built ? (
            <div className="mt-3 space-y-2">
              <p>Program {shortAddress(built.programId, 6)} · {built.accounts.length} accounts</p>
              <p>Simulation: {built.simulation.ok ? "no program error" : built.simulation.err || "not conclusive"}</p>
              <p className="text-xs text-paper-faint">{built.note}</p>
              <p className="text-xs text-paper-faint">A localhost metadata URI can still be referenced on-chain, but Pump’s indexer cannot fetch it until PUBLIC_APP_URL is public.</p>
            </div>
          ) : null}
          {signature ? (
            <p className="mt-3">
              <a className="text-cyan" href={explorerTx(signature, network)}>View signature</a>
              <button className="btn btn-quiet ml-2" onClick={() => void recheck()} disabled={pending}>Verify again</button>
            </p>
          ) : null}
          {launched && mintKeypair ? <Link className="btn btn-primary mt-3" href={`/token/${mintKeypair.publicKey.toBase58()}`}>Open token</Link> : null}
        </section>
        <section className="panel p-4 text-xs text-paper-dim">
          Meme tokens can lose all of their value. NEURALPAD does not custody wallets, does not ask for seed phrases, and does not mark a launch successful until the mint and bonding curve accounts are confirmed.
        </section>
      </aside>
    </div>
  );
}
