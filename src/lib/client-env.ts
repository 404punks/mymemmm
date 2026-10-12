export type Cluster = "devnet" | "mainnet-beta";

export const publicEnv = {
  allowMainnet: process.env.NEXT_PUBLIC_ALLOW_MAINNET === "true",
  defaultNetwork: (process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet-beta"
    ? "mainnet-beta"
    : "devnet") as Cluster,
  rpcDevnet: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
  rpcMainnet: process.env.NEXT_PUBLIC_SOLANA_RPC_URL_MAINNET || "",
  socialX: process.env.NEXT_PUBLIC_SOCIAL_X || "",
  socialGithub: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || "",
};

export function rpcFor(network: Cluster) {
  if (network === "mainnet-beta") return publicEnv.rpcMainnet;
  return publicEnv.rpcDevnet;
}
