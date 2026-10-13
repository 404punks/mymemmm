export const metadata = { title: "Risk" };

export default function RiskPage() {
  return (
    <div className="page">
      <h1 style={{ fontFamily: "var(--font-display), serif", fontSize: 48 }}>Risk disclosure</h1>
      <p>Tokens launched here are volatile. You can lose some or all of the SOL you spend. A chapter, a character, or a holder goal is not a reason a coin will rise, and VEIL does not promise profit, liquidity, or a listing.</p>
      <p>Nothing on this site is financial, legal, or tax advice. You sign every transaction yourself. A failed, expired, or rejected transaction is not a launch.</p>
      <p>On-chain data can be delayed or missing. When a price, holder count, or curve is unavailable, VEIL leaves the field empty rather than inventing it.</p>
      <p>Mainnet transactions are irreversible. Read the wallet preview before you approve it.</p>
    </div>
  );
}
