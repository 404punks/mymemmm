import { z } from "zod";
import { CATEGORIES, SKILLS, SOURCE_TYPES } from "./constants";

export const clusterSchema = z.enum(["devnet", "mainnet-beta"]);

export const agentInputSchema = z.object({
  name: z.string().trim().min(2).max(48),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,24}$/, "Use 3–24 lowercase letters, numbers, or hyphens"),
  description: z.string().trim().min(12).max(600),
  category: z.enum(CATEGORIES),
  personality: z.string().trim().min(2).max(160),
  skills: z.array(z.enum(SKILLS)).min(1).max(SKILLS.length),
  providerId: z.string().trim().max(40).optional().nullable(),
  modelId: z.string().trim().max(80).optional().nullable(),
  systemPrompt: z.string().trim().min(10).max(4000),
  dailyLimit: z.coerce.number().int().min(1).max(500),
  publish: z.boolean().default(false),
  avatarSeed: z.string().trim().max(48).optional(),
  tokenMint: z.string().trim().max(64).optional().nullable(),
});

export const indexQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(40).optional().default(""),
  source: z.enum(["", ...SOURCE_TYPES]).optional().default(""),
  provider: z.string().trim().max(60).optional().default(""),
  capability: z.string().trim().max(40).optional().default(""),
  hasToken: z.enum(["", "yes", "no"]).optional().default(""),
  cursor: z.string().trim().max(200).optional().default(""),
  limit: z.coerce.number().int().min(1).max(30).optional().default(12),
});

export const reportSchema = z.object({
  reason: z.enum(["incorrect", "duplicate", "private-data", "spam", "other"]),
  details: z.string().trim().min(8).max(500),
  reporter: z.string().trim().max(80).optional(),
});

export const submitIndexSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(12).max(600),
  sourceUrl: z.string().trim().url().max(300),
  sourceType: z.enum(["user-agent", "github", "mcp", "huggingface-model", "huggingface-space"]),
  creator: z.string().trim().max(80).optional(),
  categories: z.array(z.enum(CATEGORIES)).min(1).max(4),
  capabilities: z.array(z.enum(SKILLS)).max(SKILLS.length).default([]),
  modelProvider: z.string().trim().max(60).optional(),
  repoUrl: z.string().trim().url().max(300).optional().or(z.literal("")),
  onchainAddress: z.string().trim().max(64).optional(),
});

export const ideaSchema = z.object({
  concept: z.string().trim().min(8).max(800),
  tone: z.string().trim().max(80).optional().default(""),
});

export const analyzeSchema = z.object({
  mint: z.string().trim().min(3).max(64),
  network: clusterSchema.default("devnet"),
});

export const researchSchema = z.object({
  query: z.string().trim().min(3).max(200),
  agentHandle: z.string().trim().max(24).optional(),
});

export const brandSchema = z.object({
  name: z.string().trim().min(2).max(32),
  symbol: z.string().trim().min(1).max(13),
  concept: z.string().trim().min(4).max(400),
});

export const metadataSchema = z.object({
  name: z.string().trim().min(1).max(32),
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(13)
    .regex(/^[A-Za-z0-9]+$/, "Symbol uses letters and numbers only"),
  description: z.string().trim().min(1).max(400),
  imageFileId: z.string().trim().min(4).max(40).optional().nullable(),
  bannerFileId: z.string().trim().min(4).max(40).optional().nullable(),
  website: z.string().trim().url().max(200).optional().or(z.literal("")),
  twitter: z.string().trim().max(80).optional().or(z.literal("")),
  telegram: z.string().trim().max(80).optional().or(z.literal("")),
});

export const buildCreateSchema = z.object({
  network: clusterSchema,
  mint: z.string().trim().min(32).max(44),
  name: z.string().trim().min(1).max(32),
  symbol: z.string().trim().min(1).max(13),
  uri: z.string().trim().min(8).max(200),
  creator: z.string().trim().min(32).max(44),
  user: z.string().trim().min(32).max(44),
  mayhemMode: z.boolean().default(false),
  holderReward: z.boolean().default(false),
});

export const quoteSchema = z.object({
  network: clusterSchema,
  mint: z.string().trim().min(32).max(44),
  user: z.string().trim().min(32).max(44).optional(),
  side: z.enum(["buy", "sell"]),
  amount: z.string().trim().regex(/^\d+(\.\d+)?$/),
  slippage: z.coerce.number().min(0.1).max(50),
});

export const buildTradeSchema = quoteSchema.extend({
  user: z.string().trim().min(32).max(44),
});

export const confirmSchema = z.object({
  network: clusterSchema,
  mint: z.string().trim().min(32).max(44),
  signature: z.string().trim().min(32).max(100),
  name: z.string().trim().min(1).max(32),
  symbol: z.string().trim().min(1).max(13),
  description: z.string().trim().max(400).default(""),
  metadataUri: z.string().trim().max(200).optional(),
  imageUrl: z.string().trim().max(300).optional(),
  agentHandle: z.string().trim().max(24).optional(),
});

export const nonceSchema = z.object({
  address: z.string().trim().min(32).max(44),
});

export const verifySchema = z.object({
  address: z.string().trim().min(32).max(44),
  nonce: z.string().trim().min(8).max(80),
  signature: z.string().trim().min(32).max(200),
});

export const previewSchema = z.object({
  prompt: z.string().trim().min(2).max(500),
});
