import { prisma } from "@/lib/db";
import { assertRate } from "@/lib/api";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertRate(request, "search", 40);
    const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) || "";
    if (q.length < 2) return json({ agents: [], tokens: [], records: [] });
    const needle = q.toLowerCase();
    const [agents, tokens, records] = await Promise.all([
      prisma.agent.findMany({
        where: { published: true, OR: [{ name: { contains: q } }, { handle: { contains: needle } }] },
        take: 6,
      }),
      prisma.token.findMany({
        where: { OR: [{ name: { contains: q } }, { symbol: { contains: q } }, { mintAddress: { contains: q } }] },
        take: 6,
      }),
      prisma.indexRecord.findMany({
        where: { searchText: { contains: needle } },
        orderBy: { lastCheckedAt: "desc" },
        take: 6,
      }),
    ]);
    return json({
      agents: agents.map((agent) => ({ handle: agent.handle, name: agent.name, isDemo: agent.isDemo })),
      tokens: tokens.map((token) => ({
        mintAddress: token.mintAddress,
        name: token.name,
        symbol: token.symbol,
        isDemo: token.isDemo,
        status: token.status,
      })),
      records: records.map((record) => ({
        id: record.id,
        name: record.name,
        sourceType: record.sourceType,
        isDemo: record.isDemo,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
