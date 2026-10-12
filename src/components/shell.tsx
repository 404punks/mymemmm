"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { Logo } from "./logo";
import { useNetwork } from "./providers";
import { publicEnv } from "@/lib/client-env";
import { shortAddress, formatWhen } from "@/lib/format";

const NAV = [
  { href: "/", label: "Discover" },
  { href: "/agents", label: "AI Agents" },
  { href: "/intelligence", label: "Intelligence Index" },
  { href: "/launch", label: "Launch Token" },
  { href: "/activity", label: "Live Activity" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/docs", label: "Documentation" },
];

type SearchHit = {
  agents: { handle: string; name: string; isDemo: boolean }[];
  tokens: { mintAddress: string; name: string; symbol: string; isDemo: boolean }[];
  records: { id: string; name: string; sourceType: string; isDemo: boolean }[];
};

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit | null>(null);
  const [notes, setNotes] = useState<{ id: string; title: string; body: string; href: string | null; createdAt: string }[]>([]);
  const [session, setSession] = useState<{ authenticated: boolean; walletAddress?: string }>({ authenticated: false });
  const [authError, setAuthError] = useState("");
  const { network, setNetwork, mainnetLocked } = useNetwork();
  const wallet = useWallet();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    void fetch("/api/auth/session").then(async (res) => setSession(await res.json()));
    void fetch("/api/notifications").then(async (res) => {
      const data = await res.json();
      setNotes(data.items ?? []);
    });
  }, [wallet.publicKey]);

  useEffect(() => {
    if (!searchOpen || query.trim().length < 2) return;
    const handle = setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then(setHits)
        .catch(() => setHits(null));
    }, 180);
    return () => clearTimeout(handle);
  }, [query, searchOpen]);

  async function signIn() {
    setAuthError("");
    if (!wallet.publicKey || !wallet.signMessage) {
      setAuthError("This wallet cannot sign a login message.");
      return;
    }
    const address = wallet.publicKey.toBase58();
    const nonceRes = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    const nonce = await nonceRes.json();
    if (!nonceRes.ok) {
      setAuthError(nonce.error || "Could not issue a nonce");
      return;
    }
    const signature = await wallet.signMessage(new TextEncoder().encode(nonce.message));
    const verify = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, nonce: nonce.nonce, signature: bs58.encode(signature) }),
    });
    const data = await verify.json();
    if (!verify.ok) {
      setAuthError(data.error || "Sign-in failed");
      return;
    }
    setSession({ authenticated: true, walletAddress: address });
  }

  async function signOut() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setSession({ authenticated: false });
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} data-active={active} className="nav-link">
            <span className="font-mono text-[10px] text-cyan">{item.label.slice(0, 2).toUpperCase()}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="app-shell">
      <a href="#content" className="skip-link">Skip to content</a>
      {open ? <button className="drawer-backdrop fixed inset-0 z-30 bg-black/50" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <aside className="sidebar" data-open={open}>
        <Link href="/" aria-label="NEURALPAD home"><Logo /></Link>
        {nav}
        <div className="panel p-3 text-xs text-paper-dim">
          <div className="mb-2 flex items-center justify-between">
            <span>Network</span>
            <span className={network === "devnet" ? "badge badge-cyan" : "badge badge-warn"}>{network}</span>
          </div>
          <label className="block">
            <span className="sr-only">Select network</span>
            <select className="select" value={network} onChange={(event) => setNetwork(event.target.value as "devnet" | "mainnet-beta")}>
              <option value="devnet">Devnet</option>
              <option value="mainnet-beta" disabled={mainnetLocked}>Mainnet {mainnetLocked ? "(locked)" : ""}</option>
            </select>
          </label>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="topbar">
          <button className="icon-btn mobile-only" aria-label="Open menu" onClick={() => setOpen(true)}>
            <MenuIcon />
          </button>
          <button className="btn btn-ghost hidden min-w-[220px] justify-start text-paper-dim sm:inline-flex" onClick={() => setSearchOpen(true)}>
            Search agents, tokens, index
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button className="icon-btn sm:hidden" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <SearchIcon />
            </button>
            <div className="relative">
              <button className="icon-btn" aria-label="Notifications" aria-expanded={notesOpen} onClick={() => setNotesOpen((value) => !value)}>
                <BellIcon />
              </button>
              {notesOpen ? (
                <div className="menu panel">
                  <p className="px-2 py-1 text-xs uppercase tracking-wide text-paper-faint">Notifications</p>
                  {notes.length === 0 ? <p className="px-2 py-3 text-sm text-paper-dim">No notifications yet.</p> : null}
                  {notes.map((note) => (
                    <Link key={note.id} href={note.href || "/activity"} className="block rounded-lg px-2 py-2 hover:bg-white/5" onClick={() => setNotesOpen(false)}>
                      <span className="block text-sm">{note.title}</span>
                      <span className="block text-xs text-paper-faint">{note.body} · {formatWhen(note.createdAt)}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <WalletControl
              connected={wallet.connected}
              connecting={wallet.connecting}
              address={wallet.publicKey?.toBase58()}
              authenticated={session.authenticated && session.walletAddress === wallet.publicKey?.toBase58()}
              authError={authError}
              onConnect={(name) => {
                const match = wallet.wallets.find((item) => item.adapter.name === name);
                if (!match) return;
                wallet.select(match.adapter.name);
                void match.adapter.connect().catch(() => undefined);
              }}
              onDisconnect={() => void wallet.disconnect()}
              onSignIn={() => void signIn()}
              onSignOut={() => void signOut()}
            />
          </div>
        </header>
        <main id="content" className="main-pad">{children}</main>
        <Footer />
      </div>
      {searchOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-start bg-black/60 px-4 pt-[12vh]" role="dialog" aria-modal aria-label="Search">
          <div className="panel w-full max-w-xl p-4">
            <div className="flex gap-2">
              <input autoFocus className="field" placeholder="Search the index" value={query} onChange={(event) => setQuery(event.target.value)} />
              <button className="btn btn-ghost" onClick={() => setSearchOpen(false)}>Close</button>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {hits?.agents.map((agent) => (
                <Link key={agent.handle} href={`/agents/${agent.handle}`} onClick={() => setSearchOpen(false)} className="block rounded-lg px-2 py-1 hover:bg-white/5">
                  Agent · {agent.name} {agent.isDemo ? "· sample" : ""}
                </Link>
              ))}
              {hits?.tokens.map((token) => (
                <Link key={token.mintAddress} href={`/token/${token.mintAddress}`} onClick={() => setSearchOpen(false)} className="block rounded-lg px-2 py-1 hover:bg-white/5">
                  Token · {token.name} ({token.symbol}) {token.isDemo ? "· sample" : ""}
                </Link>
              ))}
              {hits?.records.map((record) => (
                <Link key={record.id} href={`/intelligence/${record.id}`} onClick={() => setSearchOpen(false)} className="block rounded-lg px-2 py-1 hover:bg-white/5">
                  Index · {record.name} {record.isDemo ? "· sample" : ""}
                </Link>
              ))}
              {query.length >= 2 && hits && hits.agents.length + hits.tokens.length + hits.records.length === 0 ? (
                <p className="text-paper-dim">No matches in the local database.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WalletControl(props: {
  connected: boolean;
  connecting: boolean;
  address?: string;
  authenticated: boolean;
  authError: string;
  onConnect: (name: "Phantom" | "Solflare") => void;
  onDisconnect: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="btn btn-primary shrink-0" onClick={() => setOpen((value) => !value)}>
        {props.connecting ? "Connecting" : props.address ? shortAddress(props.address) : (
          <>
            <span className="sm:hidden">Wallet</span>
            <span className="hidden sm:inline">Connect wallet</span>
          </>
        )}
      </button>
      {open ? (
        <div className="menu panel w-72">
          {!props.connected ? (
            <div className="grid gap-2">
              <button className="btn btn-ghost" onClick={() => props.onConnect("Phantom")}>Phantom</button>
              <button className="btn btn-ghost" onClick={() => props.onConnect("Solflare")}>Solflare</button>
              <p className="px-1 text-xs text-paper-faint">Connecting a wallet does not sign you in and never shares a seed phrase.</p>
            </div>
          ) : (
            <div className="grid gap-2 text-sm">
              <p className="font-mono text-xs">{props.address}</p>
              <p className="text-paper-dim">{props.authenticated ? "Session active" : "Wallet connected, not signed in"}</p>
              {props.authenticated ? (
                <button className="btn btn-ghost" onClick={props.onSignOut}>Sign out</button>
              ) : (
                <button className="btn btn-ghost" onClick={props.onSignIn}>Sign in with wallet</button>
              )}
              <Link href="/portfolio" className="btn btn-ghost" onClick={() => setOpen(false)}>Portfolio</Link>
              <button className="btn btn-quiet" onClick={props.onDisconnect}>Disconnect</button>
              {props.authError ? <p className="text-xs text-danger">{props.authError}</p> : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Footer() {
  return (
    <footer className="mx-auto grid max-w-page gap-4 px-5 pb-10 text-sm text-paper-dim md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <Logo />
        <p className="mt-3 max-w-sm">The intelligence layer for tokens. Public index, assistant profiles, and Pump program launches you sign yourself.</p>
        <p className="mt-2 text-xs text-paper-faint">Project status is reported from /api/health. Meme tokens can lose all of their value.</p>
      </div>
      <div className="grid gap-1">
        <Link href="/docs">Documentation</Link>
        <Link href="/legal/terms">Terms</Link>
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/risk">Risk disclosure</Link>
      </div>
      <div className="grid gap-1">
        <Link href="/studio">Token idea studio</Link>
        {publicEnv.socialX ? <a href={publicEnv.socialX}>X / Twitter</a> : <span>X link not configured</span>}
        {publicEnv.socialGithub ? <a href={publicEnv.socialGithub}>GitHub</a> : <span>GitHub link not configured</span>}
      </div>
    </footer>
  );
}

function MenuIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 4h12M2 8h12M2 12h12" /></svg>;
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="4" /><path d="M10 10l3.5 3.5" /></svg>;
}
function BellIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 2.5a3.5 3.5 0 0 0-3.5 3.5v2.2L3 10.5h10l-1.5-2.3V6A3.5 3.5 0 0 0 8 2.5Z" /><path d="M6.5 12a1.5 1.5 0 0 0 3 0" /></svg>;
}
