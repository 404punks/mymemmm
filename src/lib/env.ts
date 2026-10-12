function read(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

const PUBLIC_RPC = /api\.mainnet-beta\.solana\.com|api\.devnet\.solana\.com/i;

export const env = {
  databaseUrl: read("DATABASE_URL"),
  publicAppUrl: read("PUBLIC_APP_URL", "http://localhost:3000").replace(/\/$/, ""),
  authSecret: read("AUTH_SECRET", "dev-only-change-me"),
  solanaRpcUrl: read("SOLANA_RPC_URL"),
  anthropicKey: read("ANTHROPIC_API_KEY"),
  anthropicModel: read("ANTHROPIC_MODEL", "claude-sonnet-4-5"),
  pinataJwt: read("PINATA_JWT"),
  pumpPortalKey: read("PUMPPORTAL_API_KEY"),
  birdeyeKey: read("BIRDEYE_API_KEY"),
  s3Endpoint: read("S3_ENDPOINT"),
  s3Region: read("S3_REGION", "auto"),
  s3Bucket: read("S3_BUCKET"),
  s3AccessKey: read("S3_ACCESS_KEY_ID"),
  s3Secret: read("S3_SECRET_ACCESS_KEY"),
  s3PublicBase: read("S3_PUBLIC_BASE_URL").replace(/\/$/, ""),
  geoBlock: read("GEO_BLOCK_COUNTRIES")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean),
  cronSecret: read("CRON_SECRET"),
  chapterHolderGoal: Number(read("CHAPTER_HOLDER_GOAL", "100")),
  chapterHolderStep: Number(read("CHAPTER_HOLDER_STEP", "150")),
};

export function rpcProblem(): string | null {
  if (!env.solanaRpcUrl) return "Set SOLANA_RPC_URL to a paid mainnet endpoint.";
  if (process.env.NODE_ENV === "production" && PUBLIC_RPC.test(env.solanaRpcUrl)) {
    return "Production refuses the public Solana RPC. Use Helius or QuickNode.";
  }
  return null;
}

export function assertSecretConfig(kind: "ai" | "ipfs" | "rpc" | "portal-data") {
  if (kind === "ai" && !env.anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY is not set, so VEIL cannot write a character.");
  }
  if (kind === "ipfs" && !env.pinataJwt) {
    throw new Error("PINATA_JWT is not set. pump.fun no longer accepts its old IPFS upload API.");
  }
  if (kind === "rpc") {
    const problem = rpcProblem();
    if (problem) throw new Error(problem);
  }
  if (kind === "portal-data" && !env.pumpPortalKey) {
    throw new Error("PUMPPORTAL_API_KEY is not set. The data websocket is documented as keyed, and the key stays on the server.");
  }
}
