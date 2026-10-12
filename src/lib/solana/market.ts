import { ComputeBudgetProgram, PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import {
  CashbackCoinNotSupportedError,
  OnlinePumpSdk,
  PUMP_SDK,
  bondingCurveMarketCap,
  bondingCurvePda,
  canonicalPumpPoolPda,
  getBuyTokenAmountFromSolAmount,
  getBuyV3TokenAmountFromQuoteAmount,
  getSellSolAmountFromTokenAmount,
} from "@pump-fun/pump-sdk";
import { OnlinePumpAmmSdk, PUMP_AMM_PROGRAM_ID, PUMP_AMM_SDK, buyQuoteInput, sellBaseInput } from "@pump-fun/pump-swap-sdk";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { HttpError } from "../http";
import { log } from "../log";
import { solToLamports, tokenToBase } from "./amounts";
import { getConnection, parsePubkey } from "./cluster";
import type { SolanaCluster } from "../env";

function bn(value: BN) {
  return value.toString(10);
}

async function baseTokenProgram(connection: ReturnType<typeof getConnection>, mint: PublicKey) {
  const info = await connection.getAccountInfo(mint);
  if (!info) return null;
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID) || info.owner.equals(TOKEN_PROGRAM_ID)) return info.owner;
  return info.owner;
}

export async function readTokenState(network: SolanaCluster, mintAddress: string) {
  const connection = getConnection(network);
  const mint = parsePubkey(mintAddress, "Mint");
  const curveAddress = bondingCurvePda(mint);
  const online = new OnlinePumpSdk(connection);
  let curve = null;
  try {
    curve = await online.fetchBondingCurve(mint);
  } catch (error) {
    log("info", "solana.curve_missing", { mint: mintAddress, message: error instanceof Error ? error.message : "missing" });
  }
  const fetchedAt = new Date().toISOString();
  if (!curve) {
    return {
      fetchedAt,
      network,
      mint: mint.toBase58(),
      found: false,
      venue: null,
      note: "No Pump bonding-curve account was found for this mint on the selected network.",
    };
  }
  const poolAddress = canonicalPumpPoolPda(mint);
  const poolInfo = curve.complete ? await connection.getAccountInfo(poolAddress) : null;
  let marketCapQuote: string | null = null;
  try {
    marketCapQuote = bn(
      bondingCurveMarketCap({
        mintSupply: curve.tokenTotalSupply,
        virtualQuoteReserves: curve.virtualQuoteReserves,
        virtualTokenReserves: curve.virtualTokenReserves,
      }),
    );
  } catch (error) {
    log("warn", "solana.market_cap_unavailable", { message: error instanceof Error ? error.message : "failed" });
  }
  return {
    fetchedAt,
    network,
    mint: mint.toBase58(),
    found: true,
    venue: curve.complete ? "pumpswap-or-migrating" : "bonding-curve",
    complete: curve.complete,
    creator: curve.creator.toBase58(),
    creatorSource: "bonding-curve account",
    quoteMint: curve.quoteMint.toBase58(),
    isMayhemMode: curve.isMayhemMode,
    isCashbackCoin: curve.isCashbackCoin,
    isHolderReward: curve.isHolderReward,
    virtualTokenReserves: bn(curve.virtualTokenReserves),
    virtualQuoteReserves: bn(curve.virtualQuoteReserves),
    realTokenReserves: bn(curve.realTokenReserves),
    realQuoteReserves: bn(curve.realQuoteReserves),
    tokenTotalSupply: bn(curve.tokenTotalSupply),
    marketCapQuoteLamports: curve.complete ? null : marketCapQuote,
    marketCapNote: curve.complete
      ? "Bonding-curve market cap is not used after completion."
      : "Quote-unit market cap from the Pump SDK bondingCurveMarketCap helper. Not a USD figure.",
    bondingCurve: curveAddress.toBase58(),
    pool: curve.complete
      ? {
          address: poolAddress.toBase58(),
          programId: PUMP_AMM_PROGRAM_ID.toBase58(),
          accountFound: Boolean(poolInfo),
          status: poolInfo ? "pool account present" : "bonding curve complete; pool account not found yet",
        }
      : null,
    cached: false,
  };
}

async function loadCurveContext(network: SolanaCluster, mintAddress: string, userAddress: string) {
  const connection = getConnection(network);
  const mint = parsePubkey(mintAddress, "Mint");
  const user = parsePubkey(userAddress, "Wallet");
  const online = new OnlinePumpSdk(connection);
  const [global, feeConfig, tokenProgram] = await Promise.all([
    online.fetchGlobal(),
    online.fetchFeeConfig(),
    baseTokenProgram(connection, mint),
  ]);
  const buyState = await online.fetchBuyState(mint, user, tokenProgram ?? undefined);
  return { connection, mint, user, online, global, feeConfig, tokenProgram, buyState };
}

export async function quoteTrade(input: {
  network: SolanaCluster;
  mint: string;
  user?: string;
  side: "buy" | "sell";
  amount: string;
  slippage: number;
}) {
  const user = input.user ?? PublicKey.default.toBase58();
  if (user === PublicKey.default.toBase58()) {
    throw new HttpError("A wallet public key is required to quote a trade", 400, "user_required");
  }
  const ctx = await loadCurveContext(input.network, input.mint, user);
  const fetchedAt = new Date().toISOString();
  if (ctx.buyState.bondingCurve.complete) {
    return quoteMigrated(ctx.connection, ctx.mint, ctx.user, input);
  }
  if (!ctx.feeConfig) {
    throw new HttpError("Fee config account was not available, so no quote was produced", 503, "fee_config_missing");
  }
  if (input.side === "buy") {
    const quoteAmount = solToLamports(input.amount);
    try {
      const tokens = getBuyV3TokenAmountFromQuoteAmount({
        global: ctx.global,
        feeConfig: ctx.feeConfig,
        mintSupply: ctx.buyState.bondingCurve.tokenTotalSupply,
        bondingCurve: ctx.buyState.bondingCurve,
        amount: quoteAmount,
        curveBaseTokenBalance: ctx.buyState.curveBaseTokenBalance,
      });
      return {
        fetchedAt,
        venue: "bonding-curve",
        instruction: "buy_exact_quote_in_v3",
        side: "buy",
        quoteIn: quoteAmount.toString(10),
        tokensOut: tokens.toString(10),
        slippage: input.slippage,
        complete: false,
      };
    } catch (error) {
      if (!(error instanceof CashbackCoinNotSupportedError) && !ctx.buyState.bondingCurve.isCashbackCoin) {
        throw new HttpError(error instanceof Error ? error.message : "Quote failed", 400, "quote_failed");
      }
      const tokens = getBuyTokenAmountFromSolAmount({
        global: ctx.global,
        feeConfig: ctx.feeConfig,
        mintSupply: ctx.buyState.bondingCurve.tokenTotalSupply,
        bondingCurve: ctx.buyState.bondingCurve,
        amount: quoteAmount,
        quoteMint: ctx.buyState.quoteMint,
      });
      return {
        fetchedAt,
        venue: "bonding-curve",
        instruction: "buy_v2",
        side: "buy",
        quoteIn: quoteAmount.toString(10),
        tokensOut: tokens.toString(10),
        slippage: input.slippage,
        complete: false,
        note: "This coin uses the legacy buy path because v3 refused it.",
      };
    }
  }
  const tokenAmount = tokenToBase(input.amount);
  const solOut = getSellSolAmountFromTokenAmount({
    global: ctx.global,
    feeConfig: ctx.feeConfig,
    mintSupply: ctx.buyState.bondingCurve.tokenTotalSupply,
    bondingCurve: ctx.buyState.bondingCurve,
    amount: tokenAmount,
  });
  return {
    fetchedAt,
    venue: "bonding-curve",
    instruction: ctx.buyState.bondingCurve.isCashbackCoin ? "sell_v2" : "sell_v3",
    side: "sell",
    tokensIn: tokenAmount.toString(10),
    quoteOut: solOut.toString(10),
    slippage: input.slippage,
    complete: false,
  };
}

async function quoteMigrated(
  connection: ReturnType<typeof getConnection>,
  mint: PublicKey,
  user: PublicKey,
  input: { side: "buy" | "sell"; amount: string; slippage: number },
) {
  const pool = canonicalPumpPoolPda(mint);
  const info = await connection.getAccountInfo(pool);
  if (!info) {
    return {
      fetchedAt: new Date().toISOString(),
      venue: "migrating",
      complete: true,
      pool: pool.toBase58(),
      note: "Bonding curve is complete and the canonical PumpSwap pool account was not found. No price was invented.",
    };
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
    return {
      fetchedAt: new Date().toISOString(),
      venue: "pumpswap",
      instruction: "pumpswap.buyQuoteInput",
      side: "buy",
      pool: pool.toBase58(),
      programId: PUMP_AMM_PROGRAM_ID.toBase58(),
      quoteIn: quote.toString(10),
      tokensOut: result.base.toString(10),
      maxQuote: result.maxQuote.toString(10),
      slippage: input.slippage,
      complete: true,
      poolBase: state.poolBaseAmount.toString(10),
      poolQuote: state.poolQuoteAmount.toString(10),
    };
  }
  const base = tokenToBase(input.amount);
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
  return {
    fetchedAt: new Date().toISOString(),
    venue: "pumpswap",
    instruction: "pumpswap.sellBaseInput",
    side: "sell",
    pool: pool.toBase58(),
    programId: PUMP_AMM_PROGRAM_ID.toBase58(),
    tokensIn: base.toString(10),
    quoteOut: result.uiQuote.toString(10),
    minQuote: result.minQuote.toString(10),
    slippage: input.slippage,
    complete: true,
  };
}

function serialize(tx: Transaction) {
  return {
    serialized: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    feePayer: tx.feePayer?.toBase58() ?? null,
  };
}

export async function buildCreateTransaction(input: {
  network: SolanaCluster;
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  creator: string;
  user: string;
  mayhemMode: boolean;
  holderReward: boolean;
}) {
  const { buildCreateInstruction, PUMP_PROGRAM_ID } = await import("./create-instruction");
  const connection = getConnection(input.network);
  const user = parsePubkey(input.user, "Wallet");
  const creator = parsePubkey(input.creator, "Creator");
  const mint = parsePubkey(input.mint, "Mint");
  if (input.holderReward) {
    const global = await new OnlinePumpSdk(connection).fetchGlobal();
    if (!global.isHolderRewardEnabled) {
      throw new HttpError("Holder rewards are disabled on this cluster's Pump global account", 400, "holder_rewards_disabled");
    }
  }
  const instruction = await buildCreateInstruction({
    mint,
    name: input.name,
    symbol: input.symbol,
    uri: input.uri,
    creator,
    user,
    mayhemMode: input.mayhemMode,
    holderReward: input.holderReward,
  });
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: user, recentBlockhash: blockhash });
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
  tx.add(instruction);
  let simulation: { ok: boolean; err: string | null } = { ok: false, err: "not run" };
  try {
    const sim = await connection.simulateTransaction(tx);
    simulation = { ok: sim.value.err == null, err: sim.value.err ? JSON.stringify(sim.value.err) : null };
  } catch (error) {
    simulation = { ok: false, err: error instanceof Error ? error.message : "simulation failed" };
  }
  const balance = await connection.getBalance(user);
  return {
    ...serialize(tx),
    blockhash,
    lastValidBlockHeight,
    programId: PUMP_PROGRAM_ID.toBase58(),
    accounts: instruction.keys.map((key) => ({
      pubkey: key.pubkey.toBase58(),
      signer: key.isSigner,
      writable: key.isWritable,
    })),
    simulation,
    balanceLamports: balance.toString(),
    note: "Network fee is finalized by your wallet. NEURALPAD does not add a platform trading fee to this transaction.",
  };
}

export async function buildTradeTransaction(input: {
  network: SolanaCluster;
  mint: string;
  user: string;
  side: "buy" | "sell";
  amount: string;
  slippage: number;
}) {
  const ctx = await loadCurveContext(input.network, input.mint, input.user);
  const { blockhash, lastValidBlockHeight } = await ctx.connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: ctx.user, recentBlockhash: blockhash });
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
  let summary: Record<string, string> = {};

  if (ctx.buyState.bondingCurve.complete) {
    const pool = canonicalPumpPoolPda(ctx.mint);
    const amm = new OnlinePumpAmmSdk(ctx.connection);
    const state = await amm.swapSolanaState(pool, ctx.user);
    if (input.side === "buy") {
      const quote = solToLamports(input.amount);
      const ixs = await PUMP_AMM_SDK.buyQuoteInput(state, quote, input.slippage);
      tx.add(...ixs);
      summary = { venue: "pumpswap", side: "buy", quoteIn: quote.toString(10) };
    } else {
      const base = tokenToBase(input.amount);
      const ixs = await PUMP_AMM_SDK.sellBaseInput(state, base, input.slippage);
      tx.add(...ixs);
      summary = { venue: "pumpswap", side: "sell", tokensIn: base.toString(10) };
    }
  } else if (!ctx.feeConfig) {
    throw new HttpError("Fee config account was not available", 503, "fee_config_missing");
  } else if (input.side === "buy") {
    const quoteAmount = solToLamports(input.amount);
    const curve = ctx.buyState.bondingCurve;
    try {
      const amount = getBuyV3TokenAmountFromQuoteAmount({
        global: ctx.global,
        feeConfig: ctx.feeConfig,
        mintSupply: curve.tokenTotalSupply,
        bondingCurve: curve,
        amount: quoteAmount,
        curveBaseTokenBalance: ctx.buyState.curveBaseTokenBalance,
      });
      const ixs = await PUMP_SDK.buyExactQuoteInV3Instructions({
        bondingCurve: curve,
        associatedUserAccountInfo: ctx.buyState.associatedUserAccountInfo,
        mint: ctx.mint,
        user: ctx.user,
        amount,
        quoteAmount,
        slippage: input.slippage,
        tokenProgram: ctx.tokenProgram ?? undefined,
        quoteTokenProgram: ctx.buyState.quoteTokenProgram,
      });
      tx.add(...ixs);
      summary = { venue: "bonding-curve", instruction: "buy_exact_quote_in_v3", tokensOut: amount.toString(10) };
    } catch (error) {
      if (!(error instanceof CashbackCoinNotSupportedError) && !curve.isCashbackCoin) throw error;
      const amount = getBuyTokenAmountFromSolAmount({
        global: ctx.global,
        feeConfig: ctx.feeConfig,
        mintSupply: curve.tokenTotalSupply,
        bondingCurve: curve,
        amount: quoteAmount,
        quoteMint: ctx.buyState.quoteMint,
      });
      const ixs = await PUMP_SDK.buyV2Instructions({
        global: ctx.global,
        bondingCurveAccountInfo: ctx.buyState.bondingCurveAccountInfo,
        bondingCurve: curve,
        associatedUserAccountInfo: ctx.buyState.associatedUserAccountInfo,
        mint: ctx.mint,
        user: ctx.user,
        amount,
        quoteAmount,
        slippage: input.slippage,
        tokenProgram: ctx.tokenProgram ?? undefined,
        quoteTokenProgram: ctx.buyState.quoteTokenProgram,
      });
      tx.add(...ixs);
      summary = { venue: "bonding-curve", instruction: "buy_v2", tokensOut: amount.toString(10) };
    }
  } else {
    const amount = tokenToBase(input.amount);
    const quoteAmount = getSellSolAmountFromTokenAmount({
      global: ctx.global,
      feeConfig: ctx.feeConfig,
      mintSupply: ctx.buyState.bondingCurve.tokenTotalSupply,
      bondingCurve: ctx.buyState.bondingCurve,
      amount,
    });
    const curve = ctx.buyState.bondingCurve;
    if (curve.isCashbackCoin) {
      const sell = await ctx.online.fetchSellState(ctx.mint, ctx.user, ctx.tokenProgram ?? undefined);
      const ixs = await PUMP_SDK.sellV2Instructions({
        global: ctx.global,
        bondingCurveAccountInfo: sell.bondingCurveAccountInfo,
        bondingCurve: sell.bondingCurve,
        mint: ctx.mint,
        user: ctx.user,
        amount,
        quoteAmount,
        slippage: input.slippage,
        tokenProgram: ctx.tokenProgram ?? undefined,
        quoteTokenProgram: sell.quoteTokenProgram,
      });
      tx.add(...ixs);
      summary = { venue: "bonding-curve", instruction: "sell_v2", quoteOut: quoteAmount.toString(10) };
    } else {
      const ixs = await PUMP_SDK.sellV3Instructions({
        bondingCurve: curve,
        mint: ctx.mint,
        user: ctx.user,
        amount,
        quoteAmount,
        slippage: input.slippage,
        tokenProgram: ctx.tokenProgram ?? undefined,
        quoteTokenProgram: ctx.buyState.quoteTokenProgram,
      });
      tx.add(...ixs);
      summary = { venue: "bonding-curve", instruction: "sell_v3", quoteOut: quoteAmount.toString(10) };
    }
  }

  return {
    ...serialize(tx),
    blockhash,
    lastValidBlockHeight,
    summary,
    note: "Review the wallet prompt. NEURALPAD never signs this transaction.",
  };
}

export async function verifyConfirmedLaunch(network: SolanaCluster, mintAddress: string, signature: string) {
  const connection = getConnection(network);
  const mint = parsePubkey(mintAddress, "Mint");
  const tx = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx) {
    return { confirmed: false, reason: "Transaction was not found at confirmed commitment." };
  }
  if (tx.meta?.err) {
    return { confirmed: false, reason: "Transaction landed with an error." };
  }
  const message = tx.transaction.message as { staticAccountKeys?: PublicKey[]; accountKeys?: PublicKey[] };
  const keys = message.staticAccountKeys ?? message.accountKeys ?? [];
  const mentionsMint = keys.some((key) => key.equals(mint));
  if (!mentionsMint) {
    return { confirmed: false, reason: "Confirmed transaction does not include this mint." };
  }
  const curveInfo = await connection.getAccountInfo(bondingCurvePda(mint));
  const mintInfo = await connection.getAccountInfo(mint);
  if (!mintInfo || !curveInfo) {
    return { confirmed: false, reason: "Mint or bonding curve account is missing after confirmation." };
  }
  let creator: string | null = null;
  let complete = false;
  try {
    const curve = await new OnlinePumpSdk(connection).fetchBondingCurve(mint);
    creator = curve.creator.toBase58();
    complete = curve.complete;
  } catch (error) {
    log("warn", "solana.verify_decode_failed", { message: error instanceof Error ? error.message : "failed" });
  }
  return { confirmed: true, creator, complete, slot: tx.slot };
}
