# NEURALPAD

The intelligence layer for tokens.

NEURALPAD indexes public AI systems, keeps assistant profiles distinct from autonomous agents, and prepares Solana token launches through the official Pump program. You connect a wallet and sign every transaction yourself.

## What is real

- **Database.** Agents, index rows, metadata, sessions, AI jobs, and activity live in SQLite by default (PostgreSQL is supported by changing the Prisma provider).
- **Pump transactions.** `create_v2`, bonding-curve v3 trades, and PumpSwap quotes are built with `@pump-fun/pump-sdk` 4.0.0 and `@pump-fun/pump-swap-sdk`. The mint keypair is created in the browser. The server never receives a secret key and never signs.
- **A launch is confirmed only after** the transaction is found at confirmed commitment and both the mint and bonding-curve accounts exist.
- **Market numbers** come from the bonding-curve account, the Pump SDK quote helpers, Dexscreener, or `getTokenLargestAccounts`. If a source fails, the field stays empty.
- **AI calls** run on the server through an allowlist. Without `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, model routes say they are unavailable. The idea studio can still show an editable offline template, labeled as a template.
- **Index jobs** call the public Hugging Face API, the public GitHub search API, and the configured MCP registry. Failures are stored on the job. Sample seed rows are marked `demo` and are excluded from verified homepage counts.

## Local setup

```bash
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000.

SQLite paths in `DATABASE_URL` are resolved from `prisma/schema.prisma`. `file:./dev.db` is `prisma/dev.db`.

Checks:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

Index one public source:

```bash
npm run index:run -- huggingface
```

`ALLOW_INDEX_TRIGGER=true` also enables the buttons on `/intelligence` without an admin key. Set `ADMIN_API_KEY` and turn that flag off before sharing a deployment.

## Production

```bash
npm run build
npm start
```

Set at least:

- `DATABASE_URL`
- `AUTH_SECRET` (long random string)
- `PUBLIC_APP_URL` (metadata URIs must be 200 characters or fewer, and must be reachable if Pump’s indexer should fetch them)
- `SOLANA_RPC_URL` (devnet) or `SOLANA_RPC_URL_MAINNET` with `ALLOW_MAINNET=true` and `NEXT_PUBLIC_ALLOW_MAINNET=true`

PostgreSQL:

```bash
docker compose up -d postgres
```

Then set `provider = "postgresql"` in `prisma/schema.prisma`, point `DATABASE_URL` at the database, and run `npx prisma db push`.

Mainnet transaction building stays off unless both the server flag and the public flag are set. This repository does not send a mainnet transaction during development.

## Wallets

Phantom and Solflare through the Solana wallet adapter. Connecting a wallet does not create a session. Publishing an agent requires a separate sign-in message with a 10-minute nonce that can be used once. That signature does not approve a transfer.

## Feature status

| Area | State |
| --- | --- |
| Discover, agents, index, launch, activity, portfolio, docs | Implemented |
| Wallet connect and signature sessions | Implemented |
| Pump `create_v2` and user-signed submit | Implemented, devnet by default |
| Bonding-curve and migrated-pool trade builders | Implemented when RPC can read the accounts |
| AI providers, limits, cost ledger | Implemented; idle without keys |
| Hugging Face, GitHub, MCP indexing | Implemented; depends on those APIs |
| Holder census beyond largest RPC accounts | Not available |
| Autonomous agent execution | Not implemented |
| Seed-phrase custody | Not implemented |

## Risk

Meme tokens can lose all of their value. Read `/legal/risk` before signing anything. Model text is not an audit and not a price forecast.
