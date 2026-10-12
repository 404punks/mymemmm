export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="max-w-2xl space-y-3 text-sm leading-6 text-paper-dim">
      <h1 className="font-display text-3xl text-paper">Terms</h1>
      <p>NEURALPAD is software for browsing public AI records and preparing Solana transactions. You are responsible for every signature your wallet produces.</p>
      <p>Profiles you publish are public. Do not submit private repositories, personal data, or credentials. Index submissions can be reported and may remain visible until reviewed.</p>
      <p>Model output is a draft. It is not an instruction to the application, not a promise of profit, and not a statement that a token is safe or legitimate.</p>
      <p>The software is provided as-is. A local or devnet experiment is not a production launch.</p>
    </article>
  );
}
