import { Portfolio } from "@/components/portfolio";

export const metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Portfolio</h1>
      <p className="max-w-2xl text-sm text-paper-dim">Balances are read from the selected cluster for the connected public key. A connection is not a login. Agents appear only after you sign in with that same wallet.</p>
      <Portfolio />
    </div>
  );
}
