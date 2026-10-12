function read(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function flag(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}

export type SolanaCluster = "devnet" | "mainnet-beta";

export const env = {
  databaseUrl: read("DATABASE_URL", "file:./dev.db"),
  publicAppUrl: read("PUBLIC_APP_URL", "http://localhost:3000").replace(/\/$/, ""),
  authSecret: read("AUTH_SECRET", "dev-only-secret-change-me"),
  adminApiKey: read("ADMIN_API_KEY"),
  solanaRpcUrl: read("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
  solanaRpcUrlMainnet: read("SOLANA_RPC_URL_MAINNET"),
  defaultNetwork: (read("SOLANA_NETWORK", "devnet") === "mainnet-beta"
    ? "mainnet-beta"
    : "devnet") as SolanaCluster,
  allowMainnet: flag("ALLOW_MAINNET", false),
  heliusApiKey: read("HELIUS_API_KEY"),
  aiProvider: read("AI_PROVIDER", "openai"),
  openAiKey: read("OPENAI_API_KEY"),
  openAiBaseUrl: read("OPENAI_BASE_URL", "https://api.openai.com/v1"),
  anthropicKey: read("ANTHROPIC_API_KEY"),
  anthropicBaseUrl: read("ANTHROPIC_BASE_URL", "https://api.anthropic.com/v1"),
  aiModelAllowlist: read(
    "AI_MODEL_ALLOWLIST",
    "openai:gpt-4o-mini,anthropic:claude-3-5-haiku-latest",
  ),
  aiDailyLimit: Number(read("AI_DAILY_LIMIT", "200")) || 200,
  aiTimeoutMs: Number(read("AI_TIMEOUT_MS", "25000")) || 25000,
  aiCostPer1kIn: Number(read("AI_COST_PER_1K_INPUT", "0.00015")) || 0,
  aiCostPer1kOut: Number(read("AI_COST_PER_1K_OUTPUT", "0.0006")) || 0,
  githubToken: read("GITHUB_TOKEN"),
  huggingFaceToken: read("HUGGINGFACE_TOKEN"),
  mcpRegistryUrl: read(
    "MCP_REGISTRY_URL",
    "https://registry.modelcontextprotocol.io/v0.1/servers",
  ),
  indexPageSize: Math.min(50, Math.max(5, Number(read("INDEX_PAGE_SIZE", "15")) || 15)),
  allowIndexTrigger: flag("ALLOW_INDEX_TRIGGER", false),
};

export function rpcUrlFor(network: SolanaCluster): string | null {
  if (network === "mainnet-beta") {
    if (!env.allowMainnet) return null;
    return env.solanaRpcUrlMainnet || null;
  }
  return env.solanaRpcUrl || null;
}
