import Link from "next/link";

export const metadata = { title: "How it works" };

export default function HowPage() {
  return (
    <div className="page">
      <h1 style={{ fontFamily: "var(--font-display), serif", fontSize: 48 }}>How it works</h1>
      <ol style={{ fontSize: 18, lineHeight: 1.5 }}>
        <li>Sign in with your wallet. The message does not spend SOL.</li>
        <li>Write a name, ticker, and description. Claude drafts a fictional character and four chapters. You can edit every line.</li>
        <li>Upload an image. VEIL pins the image and metadata JSON through Pinata, because pump.fun no longer accepts its old upload API.</li>
        <li>Your browser creates the mint key. PumpPortal returns an unsigned create transaction. You sign the mint key locally, then the wallet signs. VEIL broadcasts it with the configured mainnet RPC.</li>
        <li>The coin is listed here only after that transaction is confirmed and the mint account exists. The Solscan link uses that signature.</li>
        <li>Chapter one is readable at a zero balance if you set that tier. Later chapters are withheld by the server until the wallet&apos;s token account balance crosses the tier. Selling drops the balance and seals them on the next read.</li>
        <li>A scheduled job can write chapter five and onward when a real holder count crosses the configured goal. Without a holder source, it waits.</li>
      </ol>
      <p>Trades use the same PumpPortal local API. Bonding-curve coins use pool <span className="gold">pump</span>. Graduated coins use <span className="gold">pump-amm</span>.</p>
      <Link className="btn btn-gold" href="/launch">Launch a coin</Link>
    </div>
  );
}
