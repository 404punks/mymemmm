import { createHash } from "node:crypto";
import { joinList } from "../lists";
import { sanitizeText } from "../sanitize";
import { canonicalSourceId, normalizePublicUrl } from "../urls";

export type NormalizedRecord = {
  externalId: string;
  name: string;
  description: string;
  sourceUrl: string;
  sourceType: string;
  creator?: string;
  categories: string[];
  capabilities: string[];
  modelProvider?: string;
  repoUrl?: string;
  onchainAddress?: string;
  provenance: string;
  verificationStatus: string;
  isDemo?: boolean;
};

export function contentHash(input: {
  name: string;
  description: string;
  sourceUrl: string;
  categories: string;
  capabilities: string;
  modelProvider: string;
  repoUrl: string;
  onchainAddress: string;
}) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function toIndexData(record: NormalizedRecord) {
  const sourceUrl = normalizePublicUrl(record.sourceUrl);
  const repoUrl = record.repoUrl ? normalizePublicUrl(record.repoUrl) : null;
  const name = sanitizeText(record.name, 120);
  const description = sanitizeText(record.description, 600);
  const categories = joinList(record.categories);
  const capabilities = joinList(record.capabilities);
  const modelProvider = record.modelProvider ? sanitizeText(record.modelProvider, 60) : "";
  const onchainAddress = record.onchainAddress ? sanitizeText(record.onchainAddress, 64) : "";
  return {
    sourceId: canonicalSourceId(record.sourceType, record.externalId),
    name,
    description,
    sourceUrl,
    sourceType: record.sourceType,
    creator: record.creator ? sanitizeText(record.creator, 80) : null,
    categories,
    capabilities,
    modelProvider: modelProvider || null,
    repoUrl,
    onchainAddress: onchainAddress || null,
    provenance: sanitizeText(record.provenance, 180),
    verificationStatus: record.verificationStatus,
    isDemo: Boolean(record.isDemo),
    status: record.isDemo ? "demo" : "ok",
    searchText: [name, description, record.creator, modelProvider, record.sourceType].filter(Boolean).join(" ").toLowerCase(),
    contentHash: contentHash({
      name,
      description,
      sourceUrl,
      categories,
      capabilities,
      modelProvider,
      repoUrl: repoUrl ?? "",
      onchainAddress,
    }),
  };
}

export function cursorPair(cursor: string): { at: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const splitAt = decoded.indexOf("|");
    if (splitAt < 0) return null;
    const at = new Date(decoded.slice(0, splitAt));
    const id = decoded.slice(splitAt + 1);
    if (!id || Number.isNaN(at.getTime())) return null;
    return { at, id };
  } catch {
    return null;
  }
}

export function encodeCursor(at: Date, id: string) {
  return Buffer.from(`${at.toISOString()}|${id}`).toString("base64url");
}
