import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { HttpError } from "../http";
import { env, rpcProblem } from "../env";

export const TRADE_LOCAL_URL = "https://pumpportal.fun/api/trade-local";

export type PortalAction = "create" | "buy" | "sell";

export type PortalRequest = {
  publicKey: string;
  action: PortalAction;
  mint: string;
  denominatedInSol: "true" | "false";
  amount: number | string;
  slippage: number;
  priorityFee: number;
  pool: "pump" | "pump-amm" | "auto";
  tokenMetadata?: { name: string; symbol: string; uri: string };
};

export function createPayload(input: {
  publicKey: string;
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  amount: number;
  slippage: number;
  priorityFee: number;
}): PortalRequest {
  if (!(input.uri.startsWith("https://") || input.uri.startsWith("ipfs://"))) {
    throw new HttpError("Metadata URI must be an https or ipfs URL", 400, "bad_uri");
  }
  new PublicKey(input.publicKey);
  new PublicKey(input.mint);
  return {
    publicKey: input.publicKey,
    action: "create",
    tokenMetadata: { name: input.name, symbol: input.symbol, uri: input.uri },
    mint: input.mint,
    denominatedInSol: "true",
    amount: input.amount,
    slippage: input.slippage,
    priorityFee: input.priorityFee,
    pool: "pump",
  };
}

export function tradePayload(input: {
  publicKey: string;
  mint: string;
  action: "buy" | "sell";
  amount: number | string;
  denominatedInSol: boolean;
  slippage: number;
  priorityFee: number;
  pool: "pump" | "pump-amm";
}): PortalRequest {
  new PublicKey(input.publicKey);
  new PublicKey(input.mint);
  return {
    publicKey: input.publicKey,
    action: input.action,
    mint: input.mint,
    denominatedInSol: input.denominatedInSol ? "true" : "false",
    amount: input.amount,
    slippage: input.slippage,
    priorityFee: input.priorityFee,
    pool: input.pool,
  };
}

export async function fetchLocalTransaction(body: PortalRequest): Promise<Uint8Array> {
  const response = await fetch(TRADE_LOCAL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = (await response.text()).slice(0, 500);
    const amountRejected = response.status === 400 && /amount/i.test(text) && body.action === "create" && body.amount !== 0;
    throw new HttpError(text || `PumpPortal returned ${response.status}`, response.status, amountRejected ? "create_amount_rejected" : "portal_rejected");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 10) throw new HttpError("PumpPortal returned an empty transaction", 502, "portal_empty");
  VersionedTransaction.deserialize(bytes);
  return bytes;
}

export function toBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

export function fromBase64(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

export function getConnection() {
  const problem = rpcProblem();
  if (problem || !env.solanaRpcUrl) throw new HttpError(problem || "RPC is not configured", 503, "rpc_unconfigured");
  return new Connection(env.solanaRpcUrl, "confirmed");
}

export async function networkFeeLamports(bytes: Uint8Array): Promise<number | null> {
  try {
    const tx = VersionedTransaction.deserialize(bytes);
    const connection = getConnection();
    const fee = await connection.getFeeForMessage(tx.message, "confirmed");
    return fee.value;
  } catch {
    return null;
  }
}

export function assertLaunchTransaction(input: {
  staticAccountKeys: string[];
  loadedKeys: string[];
  signatures: string[];
  expectedSignature: string;
  mint: string;
  payer: string;
}) {
  if (!input.signatures.includes(input.expectedSignature)) {
    throw new HttpError("The signature does not match the confirmed transaction.", 400, "signature_mismatch");
  }
  if (input.staticAccountKeys[0] !== input.payer) {
    throw new HttpError("The confirmed transaction was not paid by the signed-in wallet.", 400, "payer_mismatch");
  }
  const involved = new Set([...input.staticAccountKeys, ...input.loadedKeys]);
  if (!involved.has(input.mint)) {
    throw new HttpError("The confirmed transaction does not include this mint.", 400, "mint_mismatch");
  }
}

export function mapSendError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("insufficient") || lower.includes("lamports")) {
    return { message: "The wallet does not have enough SOL for this transaction.", code: "insufficient_sol" };
  }
  if (lower.includes("blockhash") || lower.includes("expired")) {
    return { message: "The blockhash expired before the transaction landed. Rebuild it and sign again.", code: "blockhash_expired" };
  }
  if (lower.includes("slippage") || lower.includes("too little") || lower.includes("0x1771")) {
    return { message: "The price moved past your slippage setting. Raise slippage or try a smaller size.", code: "slippage_exceeded" };
  }
  if (lower.includes("user rejected") || lower.includes("rejected")) {
    return { message: "The wallet rejected the signature. Nothing was sent.", code: "signature_rejected" };
  }
  if (lower.includes("429") || lower.includes("timeout") || lower.includes("fetch failed") || lower.includes("network")) {
    return { message: "The RPC did not accept the transaction. Check SOLANA_RPC_URL and try again.", code: "rpc_failure" };
  }
  return { message, code: "send_failed" };
}
