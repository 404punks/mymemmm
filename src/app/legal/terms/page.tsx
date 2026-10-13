export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="page">
      <h1 style={{ fontFamily: "var(--font-display), serif", fontSize: 48 }}>Terms</h1>
      <p>VEIL is an interface. Coins are created by the pump.fun program on Solana mainnet when you sign a transaction. VEIL does not custody assets, does not execute trades for you, and does not charge a platform fee.</p>
      <p>You are responsible for the name, image, and story you publish. Impersonation, hate, and sexual content are blocked and can be reported. A report does not by itself remove a coin from Solana.</p>
      <p>Availability can be limited by country when GEO_BLOCK_COUNTRIES is set. That check uses the edge country header supplied by the host. It is not a legal opinion about your location.</p>
      <p>Pump.fun and PumpPortal fees are theirs. Their schedules can change. The figures shown before signing cite the pump.fun fees page updated 8 October 2026 and PumpPortal&apos;s published 0.5% trade fee.</p>
    </div>
  );
}
