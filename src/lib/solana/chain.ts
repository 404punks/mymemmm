import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  CashbackCoinNotSupportedError,
  OnlinePumpSdk,
  bondingCurveMarketCap,
  bondingCurvePda,
  canonicalPumpPoolPda,
  getBuyTokenAmountFromSolAmount,
  getBuyV3TokenAmountFromQuoteAmount,
  getSellSolAmountFromTokenAmount,
} from "@pump-fun/pump-sdk";
import { OnlinePumpAmmSdk, PUMP_AMM_PROGRAM_ID, buyQuoteInput, sellBaseInput } from "@pump-fun/pump-swap-sdk";
import { HttpError } from "../http";
import { getConnection } from "./portal";

function bn(value: BN) {
  return value.toString(10);
}

export async function readCurve(mintAddress: string) {
  const connection = getConnection();
  const mint = new PublicKey(mintAddress);
  const online = new OnlinePumpSdk(connection);
  let curve = null;
  try {
    curve = await online.fetchBondingCurve(mint);
  } catch {
    curve = null;
  }
  const fetchedAt = new Date().toISOString();
  if (!curve) {
    return { found: false as const, fetchedAt, mint: mint.toBase58(), note: "No pump.fun bonding curve account was found for this mint." };
  }
  const poolAddress = canonicalPumpPoolPda(mint);
  const poolInfo = curve.complete ? await connection.getAccountInfo(poolAddress) : null;
  let progress: number | null = null;
  let marketCapQuote: string | null = null;
  try {
    const global = await online.fetchGlobal();
    const initial = BigInt(global.initialRealTokenReserves.toString(10));
    const real = BigInt(curve.realTokenReserves.toString(10));
    if (initial > 0n) progress = Math.max(0, Math.min(1, 1 - Number(real) / Number(initial)));
  } catch {
    progress = null;
  }
  if (!curve.complete) {
    try {
      marketCapQuote = bn(bondingCurveMarketCap({
        mintSupply: curve.tokenTotalSupply,
        virtualQuoteReserves: curve.virtualQuoteReserves,
        virtualTokenReserves: curve.virtualTokenReserves,
      }));
    } catch {
      marketCapQuote = null;
    }
  }
  return {
    found: true as const,
    fetchedAt,
    mint: mint.toBase58(),
    complete: curve.complete,
    pool: curve.complete ? "pump-amm" as const : "pump" as const,
    creator: curve.creator.toBase58(),
    bondingCurve: bondingCurvePda(mint).toBase58(),
    progress,
    marketCapQuoteLamports: marketCapQuote,
    realQuoteReserves: bn(curve.realQuoteReserves),
    realTokenReserves: bn(curve.realTokenReserves),
    tokenTotalSupply: bn(curve.tokenTotalSupply),
    poolAccount: curve.complete
      ? { address: poolAddress.toBase58(), found: Boolean(poolInfo), programId: PUMP_AMM_PROGRAM_ID.toBase58() }
      : null,
  };
}

export async function quoteTrade(input: {
  mint: string;
  user: string;
  side: "buy" | "sell";
  amount: string;
  denominatedInSol: boolean;
  slippage: number;
}) {
  const connection = getConnection();
  const mint = new PublicKey(input.mint);
  const user = new PublicKey(input.user);
  const online = new OnlinePumpSdk(connection);
  const [global, feeConfig] = await Promise.all([online.fetchGlobal(), online.fetchFeeConfig()]);
  const info = await connection.getAccountInfo(mint);
  const tokenProgram = info?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const buyState = await online.fetchBuyState(mint, user, tokenProgram);
  const fetchedAt = new Date().toISOString();
  if (!feeConfig) throw new HttpError("The pump fee config account was unavailable, so no quote was produced.", 503, "fee_config_missing");
  if (buyState.bondingCurve.complete) {
    const pool = canonicalPumpPoolPda(mint);
    const poolInfo = await connection.getAccountInfo(pool);
    if (!poolInfo) {
      return { fetchedAt, venue: "migrating", complete: true, note: "The bonding curve is complete and the PumpSwap pool account was not found. No price was substituted." };
    }
    const amm = new OnlinePumpAmmSdk(connection);
    const state = await amm.swapSolanaState(pool, user);
    if (input.side === "buy") {
      const quote = solToLamports(input.amount);
      const result = buyQuoteInput({
        quote,
        slippage: input.slippage,
        baseReserve: state.poolBaseAmount,
        quoteReserve: state.poolQuoteAmount,
        virtualQuoteReserves: state.pool.virtualQuoteReserves,
        globalConfig: state.globalConfig,
        baseMintAccount: state.baseMintAccount,
        baseMint: state.baseMint,
        coinCreator: state.pool.coinCreator,
        creator: state.pool.creator,
        feeConfig: state.feeConfig,
        quoteMint: state.pool.quoteMint,
        isMayhemMode: state.pool.isMayhemMode,
        creatorFeeBps: state.pool.creatorFeeBps,
      });
      return { fetchedAt, venue: "pump-amm", side: "buy", pool: pool.toBase58(), quoteIn: quote.toString(10), tokensOut: result.base.toString(10), complete: true };
    }
    const base = tokenToRaw(input.amount);
    const result = sellBaseInput({
      base,
      slippage: input.slippage,
      baseReserve: state.poolBaseAmount,
      quoteReserve: state.poolQuoteAmount,
      virtualQuoteReserves: state.pool.virtualQuoteReserves,
      globalConfig: state.globalConfig,
      baseMintAccount: state.baseMintAccount,
      baseMint: state.baseMint,
      coinCreator: state.pool.coinCreator,
      creator: state.pool.creator,
      feeConfig: state.feeConfig,
      quoteMint: state.pool.quoteMint,
      isMayhemMode: state.pool.isMayhemMode,
      creatorFeeBps: state.pool.creatorFeeBps,
    });
    return { fetchedAt, venue: "pump-amm", side: "sell", pool: pool.toBase58(), tokensIn: base.toString(10), quoteOut: result.uiQuote.toString(10), minQuote: result.minQuote.toString(10), complete: true };
  }
  if (input.side === "buy") {
    if (!input.denominatedInSol) throw new HttpError("Bonding-curve buys are quoted in SOL.", 400, "quote_unit");
    const quoteAmount = solToLamports(input.amount);
    try {
      const tokens = getBuyV3TokenAmountFromQuoteAmount({
        global,
        feeConfig,
        mintSupply: buyState.bondingCurve.tokenTotalSupply,
        bondingCurve: buyState.bondingCurve,
        amount: quoteAmount,
        curveBaseTokenBalance: buyState.curveBaseTokenBalance,
      });
      return { fetchedAt, venue: "pump", side: "buy", quoteIn: quoteAmount.toString(10), tokensOut: tokens.toString(10), complete: false };
    } catch (error) {
      if (!(error instanceof CashbackCoinNotSupportedError) && !buyState.bondingCurve.isCashbackCoin) {
        throw new HttpError(error instanceof Error ? error.message : "Quote failed", 400, "quote_failed");
      }
      const tokens = getBuyTokenAmountFromSolAmount({
        global,
        feeConfig,
        mintSupply: buyState.bondingCurve.tokenTotalSupply,
        bondingCurve: buyState.bondingCurve,
        amount: quoteAmount,
        quoteMint: buyState.quoteMint,
      });
      return { fetchedAt, venue: "pump", side: "buy", quoteIn: quoteAmount.toString(10), tokensOut: tokens.toString(10), complete: false, note: "Quoted on the legacy buy path." };
    }
  }
  const tokenAmount = tokenToRaw(input.amount);
  const solOut = getSellSolAmountFromTokenAmount({
    global,
    feeConfig,
    mintSupply: buyState.bondingCurve.tokenTotalSupply,
    bondingCurve: buyState.bondingCurve,
    amount: tokenAmount,
  });
  return { fetchedAt, venue: "pump", side: "sell", tokensIn: tokenAmount.toString(10), quoteOut: solOut.toString(10), complete: false };
}

export function solToLamports(amount: string) {
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new HttpError("SOL amount is not a number", 400, "bad_amount");
  const [whole, frac = ""] = amount.split(".");
  const lamports = BigInt(whole) * 1_000_000_000n + BigInt((frac + "000000000").slice(0, 9));
  return new BN(lamports.toString(10));
}

export function tokenToRaw(amount: string) {
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new HttpError("Token amount is not a number", 400, "bad_amount");
  const [whole, frac = ""] = amount.split(".");
  const raw = BigInt(whole) * 1_000_000n + BigInt((frac + "000000").slice(0, 6));
  return new BN(raw.toString(10));
}

export async function tokenBalance(owner: string, mint: string): Promise<bigint> {
  const connection = getConnection();
  const ownerKey = new PublicKey(owner);
  const mintKey = new PublicKey(mint);
  let total = 0n;
  for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
    try {
      const ata = getAssociatedTokenAddressSync(mintKey, ownerKey, false, programId);
      const balance = await connection.getTokenAccountBalance(ata);
      total += BigInt(balance.value.amount);
    } catch {
      // Missing ATA is a zero balance, not a failed read of a different program.
    }
  }
  return total;
}

export async function solBalance(owner: string): Promise<bigint> {
  const connection = getConnection();
  return BigInt(await connection.getBalance(new PublicKey(owner)));
}

export async function largestAccounts(mint: string) {
  const connection = getConnection();
  const result = await connection.getTokenLargestAccounts(new PublicKey(mint));
  return {
    fetchedAt: new Date().toISOString(),
    source: "getTokenLargestAccounts",
    note: "These are the largest token accounts the RPC returned. They are not a full holder census.",
    accounts: result.value.map((item) => ({
      address: item.address.toBase58(),
      amount: item.amount,
      uiAmount: item.uiAmount,
    })),
  };
}
