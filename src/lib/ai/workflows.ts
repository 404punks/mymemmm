import { prisma } from "../db";
import { SYSTEM_GUARD, sanitizeText, untrustedBlock } from "../sanitize";
import { recordActivity } from "../activity";
import { completeChat, parseJsonObject, resolveModel, type ModelOption } from "./providers";
import { tokenMarkSvg, bannerSvg } from "../brand";
import { saveGeneratedSvg } from "../storage";

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 33 + text.charCodeAt(i)) >>> 0;
  return h;
}

function templateIdeas(concept: string) {
  const base = sanitizeText(concept, 80);
  const words = base.split(" ").filter((word) => word.length > 2).slice(0, 3);
  const stem = (words[0] || "neural").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "neural";
  const h = hash(base);
  const candidates = [0, 1, 2].map((i) => {
    const suffix = ["pad", "node", "arc"][i];
    const name = `${stem.slice(0, 1).toUpperCase()}${stem.slice(1)}${suffix}`.slice(0, 32);
    const symbol = `${stem.slice(0, 3)}${suffix.slice(0, 2)}`.toUpperCase().slice(0, 13);
    return {
      name,
      symbol: symbol || `NP${h % 100}`,
      description: `A community token concept around ${base}. Utility, if any, is defined by its holders — this draft does not create a claim.`,
      lore: `${name} is a working name for a story about ${base}. Edit it before anything is published.`,
      utility: "No protocol utility is implied. Add a concrete use only if you will actually build it.",
    };
  });
  return {
    outputSource: "template" as const,
    notice: "No AI provider is configured. These are editable offline templates, not model-generated copy.",
    candidates,
    imagePrompts: candidates.map(
      (item) => `Original geometric token mark for ${item.name}, midnight background, cyan nodes, no existing brand logos.`,
    ),
    announcement: `${candidates[0].name} (${candidates[0].symbol}) is a draft concept. Nothing has been launched.`,
  };
}

async function runModel(model: ModelOption | null, messages: { role: "system" | "user"; content: string }[], kind: string, input: string) {
  const job = await prisma.aiJob.create({
    data: { kind, status: "running", input, provider: model?.provider, model: model?.model },
  });
  if (!model) {
    await prisma.aiJob.update({
      where: { id: job.id },
      data: { status: "unavailable", outputSource: "unavailable", completedAt: new Date(), error: "No configured model" },
    });
    return { jobId: job.id, completion: null };
  }
  try {
    const completion = await completeChat(messages, model);
    await prisma.aiJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        output: completion.text,
        outputSource: "model",
        costUsd: completion.estimatedCostUsd,
        completedAt: new Date(),
      },
    });
    await recordActivity({
      kind: "ai_analysis",
      title: `AI ${kind} completed`,
      summary: `${completion.provider}/${completion.model} finished a ${kind} draft. Estimated cost $${completion.estimatedCostUsd}.`,
      sourceKind: "ai",
      href: "/activity",
    });
    return { jobId: job.id, completion };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed";
    await prisma.aiJob.update({
      where: { id: job.id },
      data: { status: "failed", error: message, completedAt: new Date(), outputSource: "unavailable" },
    });
    await recordActivity({
      kind: "job_failed",
      title: `AI ${kind} failed`,
      summary: message,
      sourceKind: "ai",
    });
    return { jobId: job.id, completion: null, error: message };
  }
}

export async function draftTokenIdeas(concept: string, tone: string, modelHint?: { provider?: string | null; model?: string | null }) {
  const model = resolveModel(modelHint);
  const instruction = [
    "Draft three original meme-token name candidates.",
    "Return JSON: {candidates:[{name,symbol,description,lore,utility}], imagePrompts:string[], announcement:string}.",
    "Symbols max 13 letters. Names max 32 characters. Do not claim the token exists.",
    tone ? `Tone note: ${sanitizeText(tone, 80)}` : "",
    untrustedBlock("concept", concept),
  ].join("\n");
  const ran = await runModel(model, [
    { role: "system", content: SYSTEM_GUARD },
    { role: "user", content: instruction },
  ], "idea", concept);
  if (!ran.completion) {
    const template = templateIdeas(concept);
    await prisma.aiJob.update({
      where: { id: ran.jobId },
      data: {
        status: ran.error ? "failed" : "completed",
        outputSource: "template",
        output: JSON.stringify(template),
        error: ran.error,
        completedAt: new Date(),
      },
    });
    return { jobId: ran.jobId, ...template, error: ran.error };
  }
  const parsed = parseJsonObject(ran.completion.text);
  return {
    jobId: ran.jobId,
    outputSource: "model" as const,
    notice: `Draft from ${ran.completion.provider}/${ran.completion.model}. Estimated cost $${ran.completion.estimatedCostUsd}. Edit before use.`,
    provider: ran.completion.provider,
    model: ran.completion.model,
    estimatedCostUsd: ran.completion.estimatedCostUsd,
    parsed,
    raw: parsed ? undefined : ran.completion.text,
  };
}

export async function analyzeToken(input: {
  mint: string;
  facts: Record<string, unknown>;
  missing: string[];
}) {
  const model = resolveModel();
  const ran = await runModel(
    model,
    [
      { role: "system", content: SYSTEM_GUARD },
      {
        role: "user",
        content: [
          "Summarize the verified token facts. Return JSON {summary, missing, inconsistencies, interpretation}.",
          "interpretation must be explicitly non-factual. Never predict price.",
          untrustedBlock("facts", JSON.stringify(input.facts)),
          untrustedBlock("missing", input.missing.join(", ")),
        ].join("\n"),
      },
    ],
    "analysis",
    input.mint,
  );
  if (!ran.completion) {
    return {
      jobId: ran.jobId,
      outputSource: "unavailable" as const,
      notice: ran.error || "AI analysis is unavailable until a provider key is configured.",
      summary: null,
    };
  }
  return {
    jobId: ran.jobId,
    outputSource: "model" as const,
    notice: `Model interpretation from ${ran.completion.provider}/${ran.completion.model} at ${new Date().toISOString()}. Estimated cost $${ran.completion.estimatedCostUsd}.`,
    parsed: parseJsonObject(ran.completion.text),
    raw: ran.completion.text,
    estimatedCostUsd: ran.completion.estimatedCostUsd,
  };
}

export async function researchIndex(query: string, agentId?: string) {
  const records = await prisma.indexRecord.findMany({
    where: {
      searchText: { contains: query.toLowerCase() },
    },
    orderBy: { lastCheckedAt: "desc" },
    take: 6,
  });
  const citations = records.map((record) => ({
    id: record.id,
    name: record.name,
    sourceUrl: record.sourceUrl,
    sourceType: record.sourceType,
    lastCheckedAt: record.lastCheckedAt.toISOString(),
    isDemo: record.isDemo,
    verificationStatus: record.verificationStatus,
  }));
  const model = resolveModel();
  if (!model) {
    return {
      outputSource: "unavailable" as const,
      notice: "No AI provider is configured. Showing matching index records without a model summary.",
      citations,
      summary: null,
      stale: citations.some((item) => Date.now() - new Date(item.lastCheckedAt).getTime() > 1000 * 60 * 60 * 24),
    };
  }
  const packed = records
    .map((record) => untrustedBlock(record.sourceType, `${record.name}\n${record.description}\n${record.sourceUrl}`))
    .join("\n");
  const ran = await runModel(
    model,
    [
      { role: "system", content: SYSTEM_GUARD },
      {
        role: "user",
        content: `Summarize only these indexed sources for the query. Cite source URLs. If the set is empty or demo-labeled, say so. Return JSON {summary, gaps}.\nQuery label follows.\n${untrustedBlock("query", query)}\n${packed || "No records."}`,
      },
    ],
    "research",
    query,
  );
  if (agentId && ran.completion) {
    await prisma.agent.update({ where: { id: agentId }, data: { usageCount: { increment: 1 }, lastActiveAt: new Date() } });
    await prisma.agentActivity.create({
      data: {
        agentId,
        kind: "research",
        channel: "model",
        status: "completed",
        summary: `Research draft for “${sanitizeText(query, 80)}”.`,
      },
    });
  }
  return {
    jobId: ran.jobId,
    outputSource: ran.completion ? ("model" as const) : ("unavailable" as const),
    notice: ran.completion
      ? `Summary by ${ran.completion.provider}/${ran.completion.model}. Index rows may still be incomplete.`
      : ran.error || "Model request failed.",
    citations,
    parsed: ran.completion ? parseJsonObject(ran.completion.text) : null,
    raw: ran.completion?.text,
    estimatedCostUsd: ran.completion?.estimatedCostUsd,
    stale: citations.some((item) => Date.now() - new Date(item.lastCheckedAt).getTime() > 1000 * 60 * 60 * 24),
  };
}

export async function generateBrand(name: string, symbol: string, concept: string) {
  const mark = await saveGeneratedSvg(tokenMarkSvg(name, symbol));
  const banner = await saveGeneratedSvg(bannerSvg(name));
  const model = resolveModel();
  const prompts = {
    logo: `Square token mark for ${name} (${symbol}). Midnight field, electric cyan nodes, one violet node, original geometry, no third-party logos.`,
    banner: `Wide banner for ${name}. Sparse neural lines on black, room for the name, no price charts.`,
  };
  let copy: unknown = null;
  let outputSource: "model" | "template" = "template";
  let notice = "Logo and banner SVGs were drawn locally from the name. They are not model images. Prompts are included if you generate art elsewhere.";
  let estimatedCostUsd: string | undefined;
  if (model) {
    const ran = await runModel(
      model,
      [
        { role: "system", content: SYSTEM_GUARD },
        {
          role: "user",
          content: `Write a short brand note and two image prompts. Return JSON {note, logoPrompt, bannerPrompt}.\n${untrustedBlock("concept", concept)}`,
        },
      ],
      "brand",
      `${name} ${symbol}`,
    );
    if (ran.completion) {
      copy = parseJsonObject(ran.completion.text);
      outputSource = "model";
      estimatedCostUsd = ran.completion.estimatedCostUsd;
      notice = `Copy drafted by ${ran.completion.provider}/${ran.completion.model}. Images are still local SVG concepts until you approve another source.`;
    }
  }
  return {
    outputSource,
    notice,
    estimatedCostUsd,
    copy,
    prompts,
    assets: {
      logo: mark.url,
      banner: banner.url,
    },
    requiresApproval: true,
  };
}
