import Link from "next/link";
import { LaunchWizard } from "@/components/launch-wizard";

export const metadata = { title: "Launch token" };

export default async function LaunchPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; symbol?: string; agent?: string }>;
}) {
  const params = await searchParams;
  const initialName = (params.name ?? "").slice(0, 32);
  const initialSymbol = (params.symbol ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 13).toUpperCase();
  const agent = (params.agent ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 32);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Launch a token</h1>
          <p className="mt-1 max-w-2xl text-sm text-paper-dim">Creates a Token-2022 coin with the official Pump <span className="font-mono">create_v2</span> instruction. Devnet is the default. You sign in your wallet.</p>
        </div>
        <Link href="/studio" className="btn btn-ghost">Open idea studio</Link>
      </header>
      <LaunchWizard initialName={initialName} initialSymbol={initialSymbol} agent={agent} />
    </div>
  );
}
