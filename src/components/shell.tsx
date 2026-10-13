"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { Logo } from "./logo";
import { useTheme } from "./providers";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/launch", label: "Launch" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/profile", label: "Profile" },
];

function short(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wallet = useWallet();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const walletRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");

  useEffect(() => { setOpen(false); setWalletOpen(false); }, [pathname]);
  useEffect(() => {
    if (!walletOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setWalletOpen(false);
    }
    function onPointer(event: PointerEvent) {
      if (!walletRef.current?.contains(event.target as Node)) setWalletOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [walletOpen]);
  useEffect(() => {
    void fetch("/api/auth/session").then(async (res) => {
      const data = await res.json();
      setSession(data.walletAddress ?? null);
    }).catch(() => setSession(null));
  }, [wallet.publicKey]);

  async function signIn() {
    setAuthError("");
    if (!wallet.publicKey || !wallet.signMessage) {
      setAuthError("This wallet cannot sign a login message.");
      return;
    }
    const address = wallet.publicKey.toBase58();
    const nonceRes = await fetch("/api/auth/nonce", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address }) });
    const nonce = await nonceRes.json();
    if (!nonceRes.ok) { setAuthError(nonce.error || "Could not issue a nonce"); return; }
    const signature = await wallet.signMessage(new TextEncoder().encode(nonce.message));
    const verify = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, nonce: nonce.nonce, signature: bs58.encode(signature) }),
    });
    const data = await verify.json();
    if (!verify.ok) { setAuthError(data.error || "Sign-in failed"); return; }
    setSession(address);
  }

  async function signOut() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setSession(null);
  }

  const nav = (
    <nav className="nav" aria-label="Primary">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} data-active={pathname === link.href}>{link.label}</Link>
      ))}
    </nav>
  );

  return (
    <div>
      <a className="skip-link" href="#content">Skip to content</a>
      <header className="topbar">
        <button className="icon-btn mobile-only" aria-label="Open menu" onClick={() => setOpen(true)}>Menu</button>
        <Link href="/" className="brand" aria-label="VEIL home"><Logo /><span className="word">VEIL</span></Link>
        {nav}
        <div className="ml-auto flex items-center gap-2" style={{ marginLeft: "auto" }}>
          <span className="kicker" title="VEIL only builds mainnet transactions">Mainnet</span>
          <button className="icon-btn" aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} onClick={toggle}>{theme === "dark" ? "Light" : "Dark"}</button>
          <div className="relative" ref={walletRef}>
            <button className="btn btn-gold" aria-expanded={walletOpen} aria-haspopup="menu" onClick={() => setWalletOpen((value) => !value)}>
              {wallet.publicKey ? short(wallet.publicKey.toBase58()) : "Connect wallet"}
            </button>
            {walletOpen ? (
              <div className="menu panel" role="menu">
                <button className="btn" onClick={() => setWalletOpen(false)}>Close</button>
                {!wallet.connected ? (
                  <div className="grid gap-2">
                    {(["Phantom", "Solflare", "Backpack"] as const).map((name) => (
                      <button key={name} className="btn" onClick={() => {
                        const match = wallet.wallets.find((item) => item.adapter.name === name);
                        if (!match) return;
                        wallet.select(match.adapter.name);
                        void match.adapter.connect().catch(() => undefined);
                      }}>{name}</button>
                    ))}
                    <p className="muted" style={{ fontSize: 12 }}>Connecting does not sign you in and never shares a seed phrase.</p>
                  </div>
                ) : (
                  <div className="grid gap-2 text-sm">
                    <p className="muted" style={{ fontSize: 12 }}>{session === wallet.publicKey?.toBase58() ? "Signed in" : "Connected, not signed in"}</p>
                    {session === wallet.publicKey?.toBase58() ? <button className="btn" onClick={() => void signOut()}>Sign out</button> : <button className="btn" onClick={() => void signIn()}>Sign in with wallet</button>}
                    <button className="btn" onClick={() => void wallet.disconnect()}>Disconnect</button>
                    {authError ? <p className="rose" role="alert">{authError}</p> : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>
      {open ? (
        <div className="panel" style={{ position: "fixed", inset: "68px 12px auto 12px", zIndex: 40, padding: 12 }}>
          <nav className="grid gap-1" aria-label="Mobile">
            {LINKS.map((link) => <Link key={link.href} href={link.href} className="btn" style={{ justifyContent: "flex-start" }}>{link.label}</Link>)}
            <button className="btn" onClick={() => setOpen(false)}>Close</button>
          </nav>
        </div>
      ) : null}
      <main id="content">{children}</main>
      <footer className="page" style={{ paddingTop: 0 }}>
        <div className="footer-grid muted" style={{ fontSize: 14 }}>
          <div>
            <div className="brand"><Logo size={28} /><span className="word" style={{ fontSize: 18 }}>VEIL</span></div>
            <p>Coins launched here are pump.fun coins on Solana mainnet. They can go to zero.</p>
          </div>
          <div className="grid gap-1">
            <Link href="/how-it-works">How it works</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/risk">Risk disclosure</Link>
          </div>
          <p>Status is reported by /api/health. VEIL does not custody wallets and does not add a platform fee.</p>
        </div>
      </footer>
    </div>
  );
}
