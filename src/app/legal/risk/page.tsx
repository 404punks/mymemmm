export const metadata = { title: "Risk disclosure" };

export default function RiskPage() {
  return (
    <article className="max-w-2xl space-y-3 text-sm leading-6 text-paper-dim">
      <h1 className="font-display text-3xl text-paper">Risk disclosure</h1>
      <p>Meme tokens and bonding-curve tokens can lose substantial value or all of their value, quickly, and with no recovery. Liquidity can be thin. Metadata can be incomplete or misleading.</p>
      <p>NEURALPAD does not provide investment, legal, or tax advice. It does not audit tokens, programs, or wallets. It does not guarantee execution, pricing, or safety.</p>
      <p>On-chain data can be delayed or unavailable when an RPC fails. Cached observations are labeled with their source and time. Missing holder or market data is left missing.</p>
      <p>Transactions cost network fees. A simulated transaction can still fail. You should read the wallet prompt before signing. Devnet tokens have no mainnet value.</p>
    </article>
  );
}
