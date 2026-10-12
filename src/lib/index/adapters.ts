import { env } from "../env";
import { log } from "../log";
import type { NormalizedRecord } from "./normalize";

type Page = { records: NormalizedRecord[]; nextCursor?: string };

async function fetchJson(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "neuralpad-indexer", ...headers },
  });
  if (response.status === 429) {
    throw new Error(`Rate limited by ${new URL(url).hostname}`);
  }
  if (!response.ok) {
    throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export async function fetchHuggingFace(cursor?: string): Promise<Page> {
  const page = Number(cursor || "0") || 0;
  const headers: Record<string, string> = {};
  if (env.huggingFaceToken) headers.Authorization = `Bearer ${env.huggingFaceToken}`;
  const limit = env.indexPageSize;
  const modelsUrl = `https://huggingface.co/api/models?limit=${limit}&skip=${page * limit}&sort=lastModified&direction=-1`;
  const spacesUrl = `https://huggingface.co/api/spaces?limit=${Math.min(10, limit)}&skip=${page * limit}&sort=lastModified&direction=-1`;
  const [models, spaces] = await Promise.all([
    fetchJson(modelsUrl, headers),
    fetchJson(spacesUrl, headers).catch((error) => {
      log("warn", "index.hf_spaces_failed", { message: error instanceof Error ? error.message : "failed" });
      return [];
    }),
  ]);
  const records: NormalizedRecord[] = [];
  if (Array.isArray(models)) {
    for (const item of models) {
      const row = asRecord(item);
      if (!row || typeof row.id !== "string" || row.private === true) continue;
      records.push({
        externalId: `model:${row.id}`,
        name: row.id,
        description: text(row.pipeline_tag, "Public Hugging Face model"),
        sourceUrl: `https://huggingface.co/${row.id}`,
        sourceType: "huggingface-model",
        creator: text(row.author) || row.id.split("/")[0],
        categories: ["research"],
        capabilities: ["research"],
        modelProvider: "huggingface",
        provenance: "Hugging Face public models API",
        verificationStatus: "verified",
      });
    }
  }
  if (Array.isArray(spaces)) {
    for (const item of spaces) {
      const row = asRecord(item);
      if (!row || typeof row.id !== "string" || row.private === true) continue;
      records.push({
        externalId: `space:${row.id}`,
        name: row.id,
        description: text(row.sdk, "Public Hugging Face Space"),
        sourceUrl: `https://huggingface.co/spaces/${row.id}`,
        sourceType: "huggingface-space",
        creator: row.id.split("/")[0],
        categories: ["discovery"],
        capabilities: ["research"],
        modelProvider: "huggingface",
        provenance: "Hugging Face public spaces API",
        verificationStatus: "verified",
      });
    }
  }
  const next = records.length > 0 ? String(page + 1) : undefined;
  return { records, nextCursor: next };
}

export async function fetchGitHub(cursor?: string): Promise<Page> {
  const page = Number(cursor || "1") || 1;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (env.githubToken) headers.Authorization = `Bearer ${env.githubToken}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent("topic:mcp-server is:public")}&sort=updated&per_page=${env.indexPageSize}&page=${page}`;
  const payload = asRecord(await fetchJson(url, headers));
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const records: NormalizedRecord[] = [];
  for (const item of items) {
    const row = asRecord(item);
    if (!row || row.private === true || typeof row.full_name !== "string") continue;
    const html = text(row.html_url);
    if (!html.startsWith("https://github.com/")) continue;
    records.push({
      externalId: row.full_name,
      name: row.full_name,
      description: text(row.description, "Public GitHub repository"),
      sourceUrl: html,
      sourceType: "github",
      creator: text(asRecord(row.owner)?.login),
      categories: ["indexing"],
      capabilities: ["public-indexing"],
      repoUrl: html,
      provenance: "GitHub public repository search",
      verificationStatus: "verified",
    });
  }
  return { records, nextCursor: records.length > 0 ? String(page + 1) : undefined };
}

export async function fetchMcpRegistry(cursor?: string): Promise<Page> {
  const url = new URL(env.mcpRegistryUrl);
  if (cursor) url.searchParams.set("cursor", cursor);
  url.searchParams.set("limit", String(env.indexPageSize));
  const payload = await fetchJson(url.toString());
  const root = asRecord(payload);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(root?.servers)
      ? root.servers
      : Array.isArray(root?.items)
        ? root.items
        : [];
  const records: NormalizedRecord[] = [];
  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const meta = asRecord(row.server) ?? row;
    const name = text(meta.name) || text(row.name);
    const description = text(meta.description) || text(row.description) || "Public MCP server listing";
    const repo = asRecord(meta.repository) ?? asRecord(row.repository);
    const sourceUrl = text(repo?.url) || text(meta.websiteUrl) || text(row.url);
    if (!name || !sourceUrl) continue;
    records.push({
      externalId: name,
      name,
      description,
      sourceUrl,
      sourceType: "mcp",
      creator: text(asRecord(row._meta)?.owner) || undefined,
      categories: ["indexing"],
      capabilities: ["public-indexing"],
      repoUrl: text(repo?.url) || undefined,
      provenance: `MCP registry ${url.hostname}`,
      verificationStatus: "unverified",
    });
  }
  const next = text(root?.metadata && asRecord(root.metadata)?.nextCursor) || text(root?.nextCursor) || undefined;
  return { records, nextCursor: next || undefined };
}

export const adapters = {
  huggingface: fetchHuggingFace,
  github: fetchGitHub,
  mcp: fetchMcpRegistry,
} as const;

export type AdapterName = keyof typeof adapters;
