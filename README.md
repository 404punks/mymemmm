# VEIL

VEIL launches pump.fun coins on Solana mainnet from this site. Each coin has an original character and four chapters. Later chapters stay on the server until the signed-in wallet's real token balance crosses a tier. Selling drops the balance, and the next read seals those chapters again.

The browser creates the mint key and the wallet signs. The server never sees a seed or a private key. A coin is saved only after the create transaction is confirmed and the mint account exists.

## What you need before a real launch

These are not optional for a mainnet launch. The buttons call the live services and show the provider error when a key is missing. They do not invent a character, a price, or a transaction.

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | Postgres for characters, chapters, launches, and sessions |
| `AUTH_SECRET` | Session cookie hash |
| `SOLANA_RPC_URL` | Paid mainnet RPC (Helius or QuickNode). Production refuses `api.mainnet-beta.solana.com` |
| `ANTHROPIC_API_KEY` | Character and chapter writing |
| `PINATA_JWT` | Image and metadata JSON on IPFS. pump.fun no longer accepts `https://pump.fun/api/ipfs` |
| `PUBLIC_APP_URL` | Story link written into the coin description |
| `NEXT_PUBLIC_APP_URL` | Same origin, so the wallet adapter can use `/api/rpc` without exposing the RPC key |
| `PUMPPORTAL_API_KEY` | Server-side PumpPortal data websocket. `subscribeTokenTrade` is metered |
| `BIRDEYE_API_KEY` | Holder counts for the "most holders" sort and later chapters |
| `CRON_SECRET` | `POST /api/cron/chapters` |
| `GEO_BLOCK_COUNTRIES` | Optional comma-separated ISO codes, read from `x-vercel-ip-country` or `cf-ipcountry` |

S3-compatible art copies are optional (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`, `S3_REGION`). Pinata is still required for the mint metadata URI.

## Fees shown before signing

Checked on 12 October 2026.

- VEIL platform fee: 0.
- pump.fun create fee: 0 platform fee. You still pay the Solana network fee and the rent deposit inside the transaction. Source: [pump.fun fees](https://pump.fun/docs/fees), updated 8 October 2026. That page does not publish a flat 0.011 SOL rent number, so VEIL does not display one. The wallet preview is the debit.
- Bonding-curve trades: 1.25% total (0.300% creator + 0.95% protocol), taken inside the trade.
- Graduation to PumpSwap: 0.015 SOL, only if a later trade migrates the coin.
- PumpPortal: 0.5% on trades it builds, including a dev buy. No extra create fee. Source: [PumpPortal creation](https://pumpportal.fun/creation) and their trading docs.
- Priority fee: whatever you type. The default `0.00005` SOL is a starting value, not a required charge.

Create transactions are built with `POST https://pumpportal.fun/api/trade-local`, `action: "create"`, `pool: "pump"`, `denominatedInSol: "true"`, and `tokenMetadata: { name, symbol, uri }`. The mint field is the public key. The browser signs that key first, then the wallet signs. If PumpPortal rejects a non-zero dev buy on create, VEIL builds a zero-buy create and then a separate buy for you to sign.

Buys and sells use the same local endpoint. Bonding-curve coins use `pool: "pump"`. Graduated coins use `pool: "pump-amm"`.

## Local setup

```bash
cp .env.example .env
# fill the keys above
docker compose up -d postgres
npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000.

There is no seed. The explore page stays empty until a create transaction confirms.

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Deploy on Vercel

1. Create a Postgres database (Neon or Supabase) and set `DATABASE_URL`.
2. Set every required variable in the project settings. Do not prefix secrets with `NEXT_PUBLIC_`.
3. Set `NEXT_PUBLIC_APP_URL` and `PUBLIC_APP_URL` to the production origin.
4. `npx prisma db push` against that database before the first launch.
5. Deploy. `vercel.json` calls `POST /api/cron/chapters` hourly. Vercel sends `Authorization: Bearer $CRON_SECRET`.
6. Confirm `/api/health` reports the database, RPC, Anthropic, and Pinata as configured.

## Mainnet checklist

- RPC is a paid mainnet endpoint, not the public Solana RPC.
- You are signing with a wallet you control. VEIL cannot sign for you.
- The cost panel is visible and the wallet preview matches it.
- Dev buy is an amount you are willing to spend. It can go to zero.
- Metadata URI loads in a browser before you sign.
- You have not set `VEIL_E2E_SEND`. This repository's test suite refuses to broadcast.

A funded end-to-end send was not run in development. `tests/e2e.mainnet.test.ts` only deserializes a PumpPortal trade-local response when you set `VEIL_E2E_MINT` to a real bonding-curve mint, and it throws if `VEIL_E2E_SEND` or `VEIL_E2E_CONFIRM` is set.

```bash
VEIL_E2E_MINT="<bonding-curve mint>" npm run test:e2e
```

## Holder chapters

Default reading tiers for the four launch chapters are 0, 100,000, 500,000, and 1,000,000 tokens (6 decimals). Chapter text for a locked tier is omitted from the response. The coin page and the character dossier do not print it.

Later chapters are written only when Birdeye returns a holder count at or above `CHAPTER_HOLDER_GOAL` (default 100), then `CHAPTER_HOLDER_STEP` (default 150) higher for each following chapter. If the holder count is missing, the job records a skip and writes nothing.
