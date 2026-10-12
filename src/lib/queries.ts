import { prisma } from "./db";
import { splitList } from "./lists";

export async function listPublishedAgents(category?: string) {
  const agents = await prisma.agent.findMany({
    where: { published: true, ...(category ? { category } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 12,
    include: { tokens: { take: 1 }, activities: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return agents.map((agent) => ({
    id: agent.id,
    handle: agent.handle,
    name: agent.name,
    description: agent.description,
    category: agent.category,
    personality: agent.personality,
    skills: splitList(agent.skills),
    providerId: agent.providerId,
    modelId: agent.modelId,
    status: agent.status,
    autonomy: agent.autonomy,
    isDemo: agent.isDemo,
    sourceUrl: agent.sourceUrl,
    lastActiveAt: agent.lastActiveAt?.toISOString() ?? null,
    usageCount: agent.usageCount,
    avatarSeed: agent.avatarSeed,
    token: agent.tokens[0]
      ? { mint: agent.tokens[0].mintAddress, symbol: agent.tokens[0].symbol, name: agent.tokens[0].name, isDemo: agent.tokens[0].isDemo }
      : null,
    latestActivity: agent.activities[0]
      ? { summary: agent.activities[0].summary, channel: agent.activities[0].channel, createdAt: agent.activities[0].createdAt.toISOString() }
      : null,
  }));
}

export async function listTokens() {
  const tokens = await prisma.token.findMany({ orderBy: { createdAt: "desc" }, take: 12 });
  return tokens.map((token) => ({
    mintAddress: token.mintAddress,
    name: token.name,
    symbol: token.symbol,
    description: token.description,
    imageUrl: token.imageUrl,
    creatorAddress: token.creatorAddress,
    creatorSource: token.creatorSource,
    network: token.network,
    status: token.status,
    isDemo: token.isDemo,
    aiSummary: token.aiSummary,
    bondingComplete: token.bondingComplete,
    migrated: token.migrated,
  }));
}

export async function listIndexPreview() {
  const [items, newest] = await Promise.all([
    prisma.indexRecord.findMany({ orderBy: { lastCheckedAt: "desc" }, take: 5 }),
    prisma.indexRecord.findFirst({ orderBy: { lastCheckedAt: "desc" } }),
  ]);
  return {
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
      verificationStatus: item.verificationStatus,
      isDemo: item.isDemo,
      lastCheckedAt: item.lastCheckedAt.toISOString(),
      categories: splitList(item.categories),
    })),
    freshness: newest?.lastCheckedAt.toISOString() ?? null,
  };
}

export async function listActivity(take = 8) {
  const rows = await prisma.activityEvent.findMany({ orderBy: { createdAt: "desc" }, take });
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    sourceKind: row.sourceKind,
    href: row.href,
    signature: row.signature,
    isDemo: row.isDemo,
    createdAt: row.createdAt.toISOString(),
  }));
}
