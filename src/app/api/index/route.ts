import { prisma } from "@/lib/db";
import { assertRate } from "@/lib/api";
import { splitList } from "@/lib/lists";
import { cursorPair, encodeCursor } from "@/lib/index/normalize";
import { errorResponse, json } from "@/lib/http";
import { indexQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertRate(request, "index", 60);
    const url = new URL(request.url);
    const query = indexQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const cursor = query.cursor ? cursorPair(query.cursor) : null;
    const where = {
      ...(query.source ? { sourceType: query.source } : {}),
      ...(query.provider ? { modelProvider: { contains: query.provider } } : {}),
      ...(query.category ? { categories: { contains: `|${query.category}|` } } : {}),
      ...(query.capability ? { capabilities: { contains: `|${query.capability}|` } } : {}),
      ...(query.hasToken === "yes" ? { onchainAddress: { not: null } } : {}),
      ...(query.hasToken === "no" ? { onchainAddress: null } : {}),
      ...(query.q ? { searchText: { contains: query.q.toLowerCase() } } : {}),
      ...(cursor
        ? {
            OR: [
              { lastCheckedAt: { lt: cursor.at } },
              { lastCheckedAt: cursor.at, id: { lt: cursor.id } },
            ],
          }
        : {}),
    };
    const rows = await prisma.indexRecord.findMany({
      where,
      orderBy: [{ lastCheckedAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];
    const newest = await prisma.indexRecord.findFirst({ orderBy: { lastCheckedAt: "desc" } });
    return json({
      items: page.map(serialize),
      nextCursor: rows.length > query.limit && last ? encodeCursor(last.lastCheckedAt, last.id) : null,
      freshness: newest
        ? { lastCheckedAt: newest.lastCheckedAt.toISOString(), isDemo: newest.isDemo }
        : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function serialize(row: {
  id: string;
  sourceId: string;
  name: string;
  description: string;
  sourceUrl: string;
  sourceType: string;
  creator: string | null;
  categories: string;
  capabilities: string;
  modelProvider: string | null;
  repoUrl: string | null;
  onchainAddress: string | null;
  firstIndexedAt: Date;
  lastCheckedAt: Date;
  status: string;
  provenance: string;
  verificationStatus: string;
  isDemo: boolean;
}) {
  return {
    ...row,
    categories: splitList(row.categories),
    capabilities: splitList(row.capabilities),
    firstIndexedAt: row.firstIndexedAt.toISOString(),
    lastCheckedAt: row.lastCheckedAt.toISOString(),
  };
}
