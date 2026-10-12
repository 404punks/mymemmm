import { env } from "../env";
import { log } from "../log";
import { getConnection } from "./cluster";
import type { SolanaCluster } from "../env";

export async function readDexScreener(mint: string) {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return { available: false, reason: `Dexscreener returned ${response.status}`, fetchedAt: new Date().toISOString() };
    }
    const payload = (await response.json()) as {
      pairs?: {
        chainId?: string;
        url?: string;
        priceUsd?: string;
        marketCap?: number;
        fdv?: number;
        volume?: { h24?: number };
        liquidity?: { usd?: number };
        priceChange?: { h24?: number };
      }[];
    };
    const pair = (payload.pairs ?? []).find((item) => item.chainId === "solana");
    if (!pair) {
      return { available: false, reason: "No Solana pair indexed by Dexscreener", fetchedAt: new Date().toISOString() };
    }
    return {
      available: true,
      source: "dexscreener",
      fetchedAt: new Date().toISOString(),
      url: pair.url ?? null,
      priceUsd: pair.priceUsd ?? null,
      marketCapUsd: pair.marketCap ?? null,
      volumeUsd24h: pair.volume?.h24 ?? null,
      liquidityUsd: pair.liquidity?.usd ?? null,
      priceChangeH24: pair.priceChange?.h24 ?? null,
    };
  } catch (error) {
    log("warn", "market.dex_failed", { message: error instanceof Error ? error.message : "failed" });
    return { available: false, reason: "Dexscreener request failed", fetchedAt: new Date().toISOString() };
  }
}

export async function readLargestAccounts(network: SolanaCluster, mint: string, supplyBase: string | null) {
  try {
    const connection = getConnection(network);
    const result = await connection.getTokenLargestAccounts(new (await import("@solana/web3.js")).PublicKey(mint));
    const accounts = result.value.map((account) => ({
      address: account.address.toBase58(),
      amount: account.amount,
      decimals: account.decimals,
    }));
    let topShare: string | null = null;
    if (supplyBase && /^\d+$/.test(supplyBase) && supplyBase !== "0") {
      const supply = BigInt(supplyBase);
      const top = accounts.reduce((sum, account) => sum + BigInt(account.amount), 0n);
      const bps = (top * 10000n) / supply;
      topShare = (Number(bps) / 100).toFixed(2);
    }
    return {
      available: true,
      source: "solana getTokenLargestAccounts",
      fetchedAt: new Date().toISOString(),
      accounts,
      topAccountsSharePercent: topShare,
      note: "This is the share of supply in the largest accounts returned by RPC. It is not a full holder census.",
    };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : "Largest-account lookup failed",
      heliusConfigured: Boolean(env.heliusApiKey),
    };
  }
}

export async function readWalletPortfolio(network: SolanaCluster, owner: string) {
  const { PublicKey } = await import("@solana/web3.js");
  const { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = await import("@solana/spl-token");
  const connection = getConnection(network);
  const key = new PublicKey(owner);
  const [balance, legacy, token2022, signatures] = await Promise.all([
    connection.getBalance(key),
    connection.getParsedTokenAccountsByOwner(key, { programId: TOKEN_PROGRAM_ID }),
    connection.getParsedTokenAccountsByOwner(key, { programId: TOKEN_2022_PROGRAM_ID }),
    connection.getSignaturesForAddress(key, { limit: 8 }),
  ]);
  const tokens = [...legacy.value, ...token2022.value]
    .map((account) => {
      const parsed = account.account.data.parsed as {
        info?: { mint?: string; tokenAmount?: { amount?: string; decimals?: number; uiAmountString?: string } };
      };
      return {
        mint: parsed.info?.mint ?? "",
        amount: parsed.info?.tokenAmount?.amount ?? "0",
        decimals: parsed.info?.tokenAmount?.decimals ?? 0,
        uiAmount: parsed.info?.tokenAmount?.uiAmountString ?? "0",
        program: account.account.owner.toBase58(),
      };
    })
    .filter((token) => token.mint && token.amount !== "0");
  return {
    fetchedAt: new Date().toISOString(),
    network,
    owner,
    solLamports: balance.toString(),
    tokens,
    signatures: signatures.map((sig) => ({
      signature: sig.signature,
      slot: sig.slot,
      err: sig.err ? JSON.stringify(sig.err) : null,
      blockTime: sig.blockTime,
      confirmationStatus: sig.confirmationStatus,
    })),
  };
}
