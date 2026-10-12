import { env } from "../env";
import { log } from "../log";
import { prisma } from "../db";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type Completion = {
  text: string;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  estimatedCostUsd: string;
};

export type ModelOption = {
  provider: string;
  model: string;
  label: string;
  configured: boolean;
};

type Provider = {
  id: string;
  configured: boolean;
  complete: (messages: ChatMessage[], model: string) => Promise<Completion>;
};

function allowlist(): { provider: string; model: string }[] {
  return env.aiModelAllowlist
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [provider, ...rest] = entry.split(":");
      return { provider, model: rest.join(":") };
    })
    .filter((entry) => entry.provider && entry.model);
}

export function listModels(): ModelOption[] {
  return allowlist().map((entry) => ({
    ...entry,
    label: `${entry.provider} · ${entry.model}`,
    configured: isProviderConfigured(entry.provider),
  }));
}

export function isProviderConfigured(provider: string) {
  if (provider === "openai") return Boolean(env.openAiKey);
  if (provider === "anthropic") return Boolean(env.anthropicKey);
  return false;
}

function assertModel(provider: string, model: string) {
  const allowed = allowlist().some((entry) => entry.provider === provider && entry.model === model);
  if (!allowed) {
    throw new Error("That model is not on the server allowlist");
  }
  if (!isProviderConfigured(provider)) {
    throw new Error(`${provider} is not configured`);
  }
}

async function withTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.aiTimeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function cost(tokensIn: number, tokensOut: number) {
  const usd = (tokensIn / 1000) * env.aiCostPer1kIn + (tokensOut / 1000) * env.aiCostPer1kOut;
  return usd.toFixed(6);
}

const openai: Provider = {
  id: "openai",
  configured: Boolean(env.openAiKey),
  async complete(messages, model) {
    assertModel("openai", model);
    const response = await withTimeout(`${env.openAiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      log("error", "ai.openai_failed", { status: response.status, body: body.slice(0, 300) });
      throw new Error(`OpenAI request failed (${response.status})`);
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = payload.choices?.[0]?.message?.content?.trim() || "";
    const tokensIn = payload.usage?.prompt_tokens ?? 0;
    const tokensOut = payload.usage?.completion_tokens ?? 0;
    return {
      text,
      model,
      provider: "openai",
      tokensIn,
      tokensOut,
      estimatedCostUsd: cost(tokensIn, tokensOut),
    };
  },
};

const anthropic: Provider = {
  id: "anthropic",
  configured: Boolean(env.anthropicKey),
  async complete(messages, model) {
    assertModel("anthropic", model);
    const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n");
    const rest = messages.filter((message) => message.role !== "system");
    const response = await withTimeout(`${env.anthropicBaseUrl.replace(/\/$/, "")}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": env.anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        system,
        messages: rest.map((message) => ({ role: message.role, content: message.content })),
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      log("error", "ai.anthropic_failed", { status: response.status, body: body.slice(0, 300) });
      throw new Error(`Anthropic request failed (${response.status})`);
    }
    const payload = (await response.json()) as {
      content?: { text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = payload.content?.map((part) => part.text || "").join("").trim() || "";
    const tokensIn = payload.usage?.input_tokens ?? 0;
    const tokensOut = payload.usage?.output_tokens ?? 0;
    return {
      text,
      model,
      provider: "anthropic",
      tokensIn,
      tokensOut,
      estimatedCostUsd: cost(tokensIn, tokensOut),
    };
  },
};

export function resolveModel(requested?: { provider?: string | null; model?: string | null }) {
  const models = listModels().filter((model) => model.configured);
  if (requested?.provider && requested.model) {
    const match = models.find((model) => model.provider === requested.provider && model.model === requested.model);
    if (!match) return null;
    return match;
  }
  const preferred = models.find((model) => model.provider === env.aiProvider) ?? models[0];
  return preferred ?? null;
}

export async function completeChat(messages: ChatMessage[], model: ModelOption, agentId?: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.usageLedger.count({ where: { createdAt: { gte: since } } });
  if (used >= env.aiDailyLimit) {
    throw new Error("Daily AI usage limit reached");
  }
  if (agentId) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (agent) {
      const agentUses = await prisma.usageLedger.count({
        where: { agentId, createdAt: { gte: since } },
      });
      if (agentUses >= agent.dailyLimit) {
        throw new Error("This agent has reached its daily usage limit");
      }
    }
  }
  const provider = model.provider === "anthropic" ? anthropic : openai;
  const result = await provider.complete(messages, model.model);
  await prisma.usageLedger.create({
    data: {
      provider: result.provider,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      estimatedCostUsd: result.estimatedCostUsd,
      agentId,
    },
  });
  return result;
}

export function parseJsonObject(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
