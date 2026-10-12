import Link from "next/link";

export const metadata = { title: "Documentation" };

const STATUS = [
  ["Homepage, navigation, agents, index, activity, portfolio, docs", "Implemented"],
  ["Wallet connect, signature session, nonce replay protection", "Implemented"],
  ["Pump create_v2 transaction build and user signature", "Implemented, devnet by default"],
  ["Bonding-curve and PumpSwap trade builders via official SDKs", "Implemented when RPC can read the accounts"],
  ["AI provider adapter with allowlist, limits, and cost ledger", "Implemented; idle without API keys"],
  ["Hugging Face, GitHub, MCP index jobs", "Implemented; live rows require a successful fetch"],
  ["Demo seed data", "Labeled sample, excluded from verified counts"],
  ["Mainnet sends", "Disabled until ALLOW_MAINNET and a mainnet RPC are set"],
  ["Autonomous agent runtime", "Not implemented. Profiles are user-operated assistants."],
  ["Custodial signing or seed-phrase storage", "Not implemented and not accepted"],
];

export default function DocsPage() {
  return (
    <article className="space-y-6 text-sm leading-6 text-paper-dim">
      <header>
        <h1 className="font-display text-3xl text-paper">Documentation</h1>
        <p className="mt-2 max-w-2xl">NEURALPAD is an intelligence layer for public AI records and Solana token launches through the official Pump program. It does not invent program addresses, prices, or autonomous behavior.</p>
      </header>
      <section>
        <h2 className="font-display text-2xl text-paper">Local setup</h2>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-ink-950 p-4 font-mono text-xs text-paper">{`cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev`}</pre>
        <p className="mt-2">The default database is SQLite at <span className="font-mono">prisma/dev.db</span> so the app runs without extra services. For PostgreSQL, change the Prisma datasource provider to <span className="font-mono">postgresql</span>, set <span className="font-mono">DATABASE_URL</span>, and run <span className="font-mono">prisma db push</span> again. <span className="font-mono">docker-compose.yml</span> starts Postgres if you want that locally.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl text-paper">Deployment</h2>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-ink-950 p-4 font-mono text-xs text-paper">{`npm run typecheck
npm test
npm run build
npm start`}</pre>
        <p className="mt-2">Set <span className="font-mono">AUTH_SECRET</span>, <span className="font-mono">PUBLIC_APP_URL</span>, and <span className="font-mono">DATABASE_URL</span> before sharing a deployment. Metadata URIs must stay within 200 characters. A public URL is required if Pump’s indexer should fetch images. Do not put wallet keys or AI keys in client code. <span className="font-mono">NEXT_PUBLIC_ALLOW_MAINNET</span> must match the server <span className="font-mono">ALLOW_MAINNET</span> flag.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl text-paper">Pump program</h2>
        <p>Token creation uses <span className="font-mono">@pump-fun/pump-sdk</span> <span className="font-mono">PUMP_SDK.createV2Instruction</span>. Buys and sells on an open curve use <span className="font-mono">buyExactQuoteInV3Instructions</span> and <span className="font-mono">sellV3Instructions</span>, with the v2 builders when the SDK rejects a cashback coin. Completed curves use <span className="font-mono">@pump-fun/pump-swap-sdk</span> <span className="font-mono">buyQuoteInput</span> and <span className="font-mono">sellBaseInput</span> against the canonical pool PDA from the Pump SDK. Quotes come from the SDK math. The mint keypair is generated in the browser and never uploaded.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl text-paper">Indexing</h2>
        <p>Jobs: <span className="font-mono">npm run index:run -- huggingface</span>, <span className="font-mono">github</span>, or <span className="font-mono">mcp</span>. The same action is on the index page when <span className="font-mono">ALLOW_INDEX_TRIGGER=true</span>. Otherwise send <span className="font-mono">x-admin-key</span>. Private hosts, credentials in URLs, and non-public GitHub results are rejected. User submissions are stored as <span className="font-mono">user-submitted</span> and are not treated as verified.</p>
      </section>
      <section>
        <h2 className="font-display text-2xl text-paper">Feature status</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="data">
            <tbody>
              {STATUS.map(([feature, state]) => (
                <tr key={feature}><td className="text-paper">{feature}</td><td>{state}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p>Read the <Link className="text-cyan" href="/legal/risk">risk disclosure</Link> before launching or trading. Health: <Link className="text-cyan" href="/api/health">/api/health</Link>.</p>
    </article>
  );
}
