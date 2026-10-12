import { Connection, PublicKey } from "@solana/web3.js";
import { env, rpcUrlFor, type SolanaCluster } from "../env";
import { HttpError } from "../http";

const connections = new Map<string, Connection>();

export function assertCluster(network: SolanaCluster) {
  if (network === "mainnet-beta" && !env.allowMainnet) {
    throw new HttpError(
      "Mainnet transaction building is disabled. Set ALLOW_MAINNET only when you intend to use mainnet.",
      403,
      "mainnet_disabled",
    );
  }
  const url = rpcUrlFor(network);
  if (!url) {
    throw new HttpError(`No RPC URL is configured for ${network}`, 503, "rpc_unconfigured");
  }
  return url;
}

export function getConnection(network: SolanaCluster) {
  const url = assertCluster(network);
  const cached = connections.get(url);
  if (cached) return cached;
  const connection = new Connection(url, {
    commitment: "confirmed",
    disableRetryOnRateLimit: false,
    confirmTransactionInitialTimeout: 60_000,
  });
  connections.set(url, connection);
  return connection;
}

export function parsePubkey(value: string, label: string) {
  try {
    return new PublicKey(value);
  } catch {
    throw new HttpError(`${label} is not a valid public key`, 400, "bad_pubkey");
  }
}

export function isValidPublicKey(value: string) {
  try {
    void new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}
