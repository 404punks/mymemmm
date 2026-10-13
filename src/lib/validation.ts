import { z } from "zod";

const social = z.string().trim().max(200).optional().or(z.literal(""));

const tierList = z.array(z.string().regex(/^\d+(\.\d{1,6})?$/)).length(4).refine((tiers) => {
  const values = tiers.map(Number);
  return values.every((value, index) => index === 0 || value >= values[index - 1]);
}, "Each chapter tier must be at least as high as the one before it");

export const draftSchema = z.object({
  name: z.string().trim().min(1).max(32),
  symbol: z.string().trim().min(1).max(13).regex(/^[A-Za-z0-9]+$/, "Ticker uses letters and numbers only"),
  description: z.string().trim().min(1).max(400),
  genre: z.string().trim().min(2).max(40),
  twitter: social,
  telegram: social,
  website: z.string().trim().url().max(200).optional().or(z.literal("")),
  tiers: tierList.optional(),
  draftId: z.string().trim().min(8).max(40).optional(),
});

export const chapterEditSchema = z.object({
  draftId: z.string().trim().min(8).max(40),
  tiers: tierList.optional(),
  character: z.object({
    name: z.string().trim().min(1).max(80),
    epithet: z.string().trim().min(1).max(120),
    premise: z.string().trim().min(1).max(600),
    voice: z.string().trim().min(1).max(300),
    appearance: z.string().trim().min(1).max(400),
  }),
  chapters: z.array(z.object({
    title: z.string().trim().min(1).max(80),
    body: z.string().trim().min(1).max(2500),
  })).length(4),
});

export const buildCreateSchema = z.object({
  draftId: z.string().trim().min(8).max(40),
  publicKey: z.string().trim().min(32).max(44),
  mint: z.string().trim().min(32).max(44),
  devBuySol: z.number().min(0).max(100),
  slippage: z.number().min(0).max(50),
  priorityFee: z.number().min(0).max(0.1),
});

export const buildTradeSchema = z.object({
  publicKey: z.string().trim().min(32).max(44),
  mint: z.string().trim().min(32).max(44),
  action: z.enum(["buy", "sell"]),
  amount: z.union([z.number().positive().max(1_000_000_000), z.string().regex(/^\d{1,3}%$/)]),
  denominatedInSol: z.boolean(),
  slippage: z.number().min(0).max(50),
  priorityFee: z.number().min(0).max(0.1),
});

export const sendSchema = z.object({
  transaction: z.string().trim().min(20).max(20000),
});

export const confirmSchema = z.object({
  draftId: z.string().trim().min(8).max(40),
  mint: z.string().trim().min(32).max(44),
  signature: z.string().trim().min(64).max(128),
  creator: z.string().trim().min(32).max(44),
  devBuySol: z.number().min(0).max(100),
});

export const reportSchema = z.object({
  mint: z.string().trim().min(32).max(44),
  reason: z.enum(["impersonation", "hate", "sexual", "scam", "other"]),
  detail: z.string().trim().min(4).max(500),
});

export const nonceSchema = z.object({
  address: z.string().trim().min(32).max(44),
});

export const verifySchema = nonceSchema.extend({
  nonce: z.string().trim().min(16).max(80),
  signature: z.string().trim().min(64).max(200),
});
