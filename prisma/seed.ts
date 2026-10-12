import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.tradeRecord.deleteMany();
  await prisma.priceObservation.deleteMany();
  await prisma.token.deleteMany({ where: { isDemo: true } });
  await prisma.agentActivity.deleteMany({ where: { agent: { isDemo: true } } });
  await prisma.agent.deleteMany({ where: { isDemo: true } });
  await prisma.indexReport.deleteMany({ where: { record: { isDemo: true } } });
  await prisma.indexRecord.deleteMany({ where: { isDemo: true } });

  const lumen = await prisma.agent.create({
    data: {
      handle: "lumen",
      name: "Lumen",
      description: "Sample research assistant for reading public model cards. This profile is seeded demo data and does not call a model.",
      avatarSeed: "lumen",
      category: "research",
      personality: "Quiet, citation-first",
      skills: "|research|public-indexing|",
      systemPrompt: "Sample system prompt. Do not treat this profile as a live model.",
      status: "paused",
      autonomy: "user-operated-assistant",
      published: true,
      isDemo: true,
      sourceUrl: "https://example.com/neuralpad/sample/lumen",
      usageCount: 0,
    },
  });
  const keel = await prisma.agent.create({
    data: {
      handle: "keel",
      name: "Keel",
      description: "Sample markets assistant. It does not trade and it does not predict prices.",
      avatarSeed: "keel",
      category: "markets",
      personality: "Skeptical about missing data",
      skills: "|market-analytics|token-discovery|",
      systemPrompt: "Sample system prompt for market notes. Separate facts from interpretation.",
      status: "paused",
      published: true,
      isDemo: true,
      sourceUrl: "https://example.com/neuralpad/sample/keel",
    },
  });
  await prisma.agent.create({
    data: {
      handle: "mica",
      name: "Mica",
      description: "Sample meme-branding assistant. Drafts stay unpublished until a person approves them.",
      avatarSeed: "mica",
      category: "memes",
      personality: "Playful, then precise",
      skills: "|meme-generation|content-drafting|",
      systemPrompt: "Sample prompt. Never claim a token has launched.",
      status: "paused",
      published: true,
      isDemo: true,
    },
  });

  await prisma.agentActivity.create({
    data: {
      agentId: lumen.id,
      kind: "seed",
      channel: "system",
      status: "completed",
      summary: "Sample profile created by the seed script. No model call ran.",
    },
  });

  const token = await prisma.token.create({
    data: {
      mintAddress: "demo-lumen-node",
      name: "Lumen Node",
      symbol: "LNODE",
      description: "Sample token card. It has no mint account and no market.",
      imageUrl: "/avatar/lumen",
      creatorSource: "demo",
      network: "demo",
      status: "demo",
      isDemo: true,
      agentId: lumen.id,
      aiSummary: "Sample summary stored with the seed. This sentence was not produced by a model.",
    },
  });
  await prisma.token.create({
    data: {
      mintAddress: "demo-keel-mark",
      name: "Keel Mark",
      symbol: "KEEL",
      description: "Another labeled sample. Price fields are intentionally empty.",
      imageUrl: "/avatar/keel",
      creatorSource: "demo",
      network: "demo",
      status: "demo",
      isDemo: true,
      agentId: keel.id,
    },
  });

  const records = [
    ["huggingface-model", "sample/lumen-encoder", "Sample model card", "huggingface"],
    ["github", "example/public-agent-notes", "Sample repository metadata", ""],
    ["mcp", "example.sample/server", "Sample MCP directory row", ""],
    ["user-agent", "sample-lumen", "Sample user-submitted agent", ""],
  ] as const;
  for (const [sourceType, name, description, provider] of records) {
    await prisma.indexRecord.create({
      data: {
        sourceId: `${sourceType}:sample:${name}`,
        name,
        description: `${description}. Seeded locally. Not fetched from the upstream source.`,
        sourceUrl: `https://example.com/neuralpad/sample/${encodeURIComponent(name)}`,
        sourceType,
        creator: "NEURALPAD seed",
        categories: "|research|",
        capabilities: "|research|",
        modelProvider: provider || null,
        provenance: "Seed script. This row is demo data.",
        verificationStatus: "demo",
        status: "demo",
        isDemo: true,
        searchText: `${name} ${description} sample`.toLowerCase(),
      },
    });
  }

  await prisma.activityEvent.createMany({
    data: [
      {
        kind: "agent_published",
        title: "Sample profile Lumen published",
        summary: "Seed data only. No wallet signed this event.",
        sourceKind: "system",
        href: "/agents/lumen",
        isDemo: true,
      },
      {
        kind: "index_update",
        title: "Sample index rows loaded",
        summary: "The seed script inserted labeled demo records.",
        sourceKind: "system",
        href: "/intelligence",
        isDemo: true,
      },
      {
        kind: "ai_analysis",
        title: "Sample analysis placeholder",
        summary: "No model was called. This row shows how AI events are badged.",
        sourceKind: "ai",
        href: `/token/${token.mintAddress}`,
        isDemo: true,
      },
    ],
  });

  await prisma.notification.create({
    data: {
      title: "Sample dataset loaded",
      body: "Verified live counts stay at zero until a real index job or confirmed launch.",
      href: "/docs",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
