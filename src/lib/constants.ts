export const SKILLS = [
  "research",
  "market-analytics",
  "meme-generation",
  "token-discovery",
  "public-indexing",
  "content-drafting",
] as const;

export const CATEGORIES = [
  "research",
  "markets",
  "memes",
  "discovery",
  "indexing",
  "drafting",
  "community",
] as const;

export const SOURCE_TYPES = [
  "huggingface-model",
  "huggingface-space",
  "github",
  "mcp",
  "user-agent",
  "solana-mint",
] as const;

export const AUTONOMY_LABEL = "User-operated assistant";

export type Skill = (typeof SKILLS)[number];
export type Category = (typeof CATEGORIES)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SKILL_LABELS: Record<Skill, string> = {
  research: "Research",
  "market-analytics": "Market analytics",
  "meme-generation": "Meme generation",
  "token-discovery": "Token discovery",
  "public-indexing": "Public data indexing",
  "content-drafting": "Content drafting",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  research: "Research",
  markets: "Markets",
  memes: "Memes",
  discovery: "Discovery",
  indexing: "Indexing",
  drafting: "Drafting",
  community: "Community",
};

export const SOURCE_LABELS: Record<SourceType, string> = {
  "huggingface-model": "Hugging Face model",
  "huggingface-space": "Hugging Face Space",
  github: "GitHub",
  mcp: "MCP registry",
  "user-agent": "User-submitted agent",
  "solana-mint": "Solana mint",
};
