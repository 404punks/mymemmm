"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Character = { name: string; epithet: string; premise: string; voice: string; appearance: string };
type Chapter = { title: string; body: string };
type Built = { mode: "create" | "create-then-buy"; transaction: string; costs: { label: string; detail: string }[]; note: string };

const DEFAULT_TIERS = ["0", "100000", "500000", "1000000"];

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function LaunchForm() {
  const router = useRouter();
  const wallet = useWallet();
  const mintRef = useRef<Keypair | null>(null);
  const [mintAddress, setMintAddress] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("mystery");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [website, setWebsite] = useState("");
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [draftId, setDraftId] = useState("");
  const [character, setCharacter] = useState<Character | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [imageId, setImageId] = useState("");
  const [devBuy, setDevBuy] = useState(0);
  const [slippage, setSlippage] = useState(10);
  const [priorityFee, setPriorityFee] = useState(0.00005);
  const [built, setBuilt] = useState<Built | null>(null);
  const [status, setStatus] = useState("Nothing has been sent.");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function mintKey() {
    if (!mintRef.current) {
      mintRef.current = Keypair.generate();
      setMintAddress(mintRef.current.publicKey.toBase58());
    }
    return mintRef.current;
  }

  async function persistEdits() {
    if (!draftId || !character) return;
    const response = await fetch("/api/story", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draftId, character, chapters, tiers }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save edits");
  }

  async function writeStory() {
    setPending(true);
    setError("");
    try {
      const data = await post("/api/story", { name, symbol, description, genre, twitter, telegram, website, tiers });
      setDraftId(data.draftId);
      setCharacter(data.character);
      setChapters(data.chapters);
      setBuilt(null);
      setStatus("Character written. Edit it, or regenerate, before you upload metadata. Nothing is on-chain.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Story failed");
    } finally {
      setPending(false);
    }
  }

  async function saveEdits() {
    setPending(true);
    setError("");
    try {
      await persistEdits();
      setStatus("Edits saved on the draft.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  async function prepare() {
    if (!wallet.publicKey) {
      setError("Connect the wallet that will pay for creation, then sign in.");
      return;
    }
    setPending(true);
    setError("");
    setBuilt(null);
    try {
      if (character) await persistEdits();
      const key = mintKey();
      await post("/api/launch/metadata", { draftId, imageFileId: imageId, mint: key.publicKey.toBase58() });
      const data = await post("/api/launch/build", {
        draftId,
        publicKey: wallet.publicKey.toBase58(),
        mint: key.publicKey.toBase58(),
        devBuySol: devBuy,
        slippage,
        priorityFee,
      });
      setBuilt(data);
      setStatus(data.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the transaction");
    } finally {
      setPending(false);
    }
  }

  async function signAndSend(base64: string, signMint: boolean) {
    if (!wallet.signTransaction || !wallet.publicKey) throw new Error("Connect a wallet that can sign.");
    const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));
    if (signMint) tx.sign([mintKey()]);
    let signed: VersionedTransaction;
    try {
      signed = await wallet.signTransaction(tx);
    } catch {
      throw new Error("The wallet rejected the signature. Nothing was sent.");
    }
    const transaction = bytesToBase64(signed.serialize());
    const response = await fetch("/api/solana/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transaction }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Send failed");
    return data.signature as string;
  }

  async function launch() {
    if (!built || !wallet.publicKey) return;
    setPending(true);
    setError("");
    try {
      const signature = await signAndSend(built.transaction, true);
      setStatus("Create transaction confirmed. Checking the mint before this is called a launch.");
      if (built.mode === "create-then-buy" && devBuy > 0) {
        try {
          const buy = await post("/api/trade/build", {
            publicKey: wallet.publicKey.toBase58(),
            mint: mintKey().publicKey.toBase58(),
            action: "buy",
            amount: devBuy,
            denominatedInSol: true,
            slippage,
            priorityFee,
          });
          await signAndSend(buy.transaction, false);
        } catch (err) {
          setError(`The coin may exist, but the dev buy did not finish. ${err instanceof Error ? err.message : ""}`);
        }
      }
      const confirmed = await post("/api/launch/confirm", {
        draftId,
        mint: mintKey().publicKey.toBase58(),
        signature,
        creator: wallet.publicKey.toBase58(),
        devBuySol: devBuy,
      });
      if (!confirmed.confirmed) throw new Error("The mint was not verified.");
      router.push(`/token/${confirmed.mint}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
      setStatus("No launch is recorded unless the mint account is confirmed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="split">
      <form className="panel stack" onSubmit={(event) => event.preventDefault()}>
        <Label>Name<Input maxLength={32} value={name} onChange={(event) => setName(event.target.value)} /></Label>
        <Label>Ticker<Input maxLength={13} value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></Label>
        <Label>Description<Textarea maxLength={400} value={description} onChange={(event) => setDescription(event.target.value)} /></Label>
        <Label>Genre<Input value={genre} onChange={(event) => setGenre(event.target.value)} /></Label>
        <Label>Twitter<Input value={twitter} onChange={(event) => setTwitter(event.target.value)} placeholder="Optional" /></Label>
        <Label>Telegram<Input value={telegram} onChange={(event) => setTelegram(event.target.value)} placeholder="Optional" /></Label>
        <Label>Website<Input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="Optional https URL" /></Label>
        <fieldset className="stack">
          <legend>Reading tiers, in tokens</legend>
          {tiers.map((tier, index) => (
            <Label key={index}>Chapter {index + 1}
              <Input value={tier} inputMode="decimal" onChange={(event) => setTiers(tiers.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
            </Label>
          ))}
        </fieldset>
        <Button type="button" variant="gold" disabled={pending} onClick={() => {
          if (name.trim().length < 1 || symbol.trim().length < 1 || description.trim().length < 1) {
            setError("Add a name, ticker, and description before writing a character.");
            return;
          }
          void writeStory();
        }}>
          {pending ? "Working" : draftId ? "Regenerate character" : "Write the character"}
        </Button>
        <p className="muted">This calls Claude on the server. Sign in first. A missing key returns the provider error. It does not invent a character.</p>
        <p className="status" role="status" aria-live="polite">{status}</p>
        {error ? <p className="rose" role="alert">{error}</p> : null}
        {character ? (
          <div className="stack">
            <Label>Character name<Input value={character.name} onChange={(event) => setCharacter({ ...character, name: event.target.value })} /></Label>
            <Label>Epithet<Input value={character.epithet} onChange={(event) => setCharacter({ ...character, epithet: event.target.value })} /></Label>
            <Label>Premise<Textarea value={character.premise} onChange={(event) => setCharacter({ ...character, premise: event.target.value })} /></Label>
            <Label>Voice<Textarea value={character.voice} onChange={(event) => setCharacter({ ...character, voice: event.target.value })} /></Label>
            <Label>Appearance<Textarea value={character.appearance} onChange={(event) => setCharacter({ ...character, appearance: event.target.value })} /></Label>
            {chapters.map((chapter, index) => (
              <Label key={index}>Chapter {index + 1}
                <Input value={chapter.title} onChange={(event) => setChapters(chapters.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} />
                <Textarea value={chapter.body} onChange={(event) => setChapters(chapters.map((item, itemIndex) => itemIndex === index ? { ...item, body: event.target.value } : item))} />
              </Label>
            ))}
            <Button type="button" disabled={pending} onClick={() => void saveEdits()}>Save edits</Button>
          </div>
        ) : null}
        <Label>Token image
          <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const body = new FormData();
            body.set("file", file);
            void fetch("/api/files", { method: "POST", body }).then(async (res) => {
              const data = await res.json();
              if (!res.ok) {
                setError(data.error || "Upload failed");
                return;
              }
              setImageId(data.id);
              setStatus("Image accepted.");
            });
          }} />
        </Label>
        <Label>Dev buy, SOL<Input type="number" min={0} step="0.001" value={devBuy} onChange={(event) => setDevBuy(Number(event.target.value))} /></Label>
        <Label>Slippage, percent<Input type="number" min={0} max={50} value={slippage} onChange={(event) => setSlippage(Number(event.target.value))} /></Label>
        <Label>Priority fee, SOL<Input type="number" min={0} step="0.00001" value={priorityFee} onChange={(event) => setPriorityFee(Number(event.target.value))} /></Label>
        <Button type="button" disabled={pending || !draftId || !imageId} onClick={() => void prepare()}>Prepare transaction</Button>
        <Button type="button" variant="gold" disabled={pending || !built} onClick={() => void launch()}>Sign and send</Button>
      </form>
      <aside className="panel stack">
        <h2>Before you sign</h2>
        <p className="muted">Mint {mintAddress || "Created in this browser when you prepare the transaction. The secret never leaves this tab."}</p>
        {imageId ? <img alt="Token" src={`/api/files/${imageId}`} width={96} height={96} /> : null}
        {built ? (
          <ul>
            {built.costs.map((line) => <li key={line.label}><b>{line.label}.</b> <span className="muted">{line.detail}</span></li>)}
          </ul>
        ) : <p className="muted">Costs appear from the unsigned transaction and the published fee schedules. The wallet preview is the debit.</p>}
        <p className="muted">VEIL fee is 0. The wallet must approve every signature. A rejected signature sends nothing.</p>
      </aside>
    </div>
  );
}
