import { LaunchForm } from "@/components/launch-form";

export const metadata = { title: "Launch" };

export default function LaunchPage() {
  return (
    <div className="page">
      <h1 style={{ fontFamily: "var(--font-display), serif", fontSize: 48 }}>Launch a coin</h1>
      <p className="muted">This builds a pump.fun create transaction on Solana mainnet through PumpPortal. You sign it. VEIL records the coin only after the mint account is confirmed.</p>
      <LaunchForm />
    </div>
  );
}
