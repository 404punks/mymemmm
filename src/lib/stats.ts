import { prisma } from "./db";

export async function getEcosystemStats() {
  const agentSources = ["github", "mcp", "user-agent", "huggingface-space"];
  const [liveAgents, liveModels, liveTokens, liveLaunches, demoAgents, demoModels, demoTokens, recent] =
    await Promise.all([
      prisma.indexRecord.count({ where: { isDemo: false, sourceType: { in: agentSources } } }),
      prisma.indexRecord.count({ where: { isDemo: false, sourceType: "huggingface-model" } }),
      prisma.token.count({ where: { isDemo: false, status: { in: ["confirmed", "pending"] } } }),
      prisma.token.count({ where: { isDemo: false, status: "confirmed" } }),
      prisma.indexRecord.count({ where: { isDemo: true, sourceType: { in: agentSources } } }),
      prisma.indexRecord.count({ where: { isDemo: true, sourceType: "huggingface-model" } }),
      prisma.token.count({ where: { isDemo: true } }),
      prisma.indexRecord.findMany({
        orderBy: { lastCheckedAt: "desc" },
        take: 4,
        select: {
          id: true,
          name: true,
          sourceType: true,
          lastCheckedAt: true,
          isDemo: true,
          verificationStatus: true,
        },
      }),
    ]);

  const liveTotal = liveAgents + liveModels + liveTokens + liveLaunches;
  const demoTotal = demoAgents + demoModels + demoTokens;
  const mode = liveTotal > 0 ? "live" : demoTotal > 0 ? "demo" : "empty";

  return {
    mode,
    generatedAt: new Date().toISOString(),
    verified: {
      indexedAgents: liveAgents,
      indexedModels: liveModels,
      trackedTokens: liveTokens,
      successfulLaunches: liveLaunches,
    },
    demo:
      demoTotal > 0
        ? {
            indexedAgents: demoAgents,
            indexedModels: demoModels,
            trackedTokens: demoTokens,
            note: "Sample rows stored in the local database. They are not live index totals.",
          }
        : null,
    recentUpdates: recent.map((row) => ({
      id: row.id,
      name: row.name,
      sourceType: row.sourceType,
      lastCheckedAt: row.lastCheckedAt.toISOString(),
      isDemo: row.isDemo,
      verificationStatus: row.verificationStatus,
    })),
  };
}
