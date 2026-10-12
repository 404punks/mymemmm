import { prisma } from "@/lib/db";
import { json, errorResponse } from "@/lib/http";
import { assertRate } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertRate(request, "activity", 60);
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") || "";
    const sourceKind = url.searchParams.get("source") || "";
    const cursor = url.searchParams.get("cursor") || "";
    const take = 20;
    const rows = await prisma.activityEvent.findMany({
      where: {
        ...(kind ? { kind } : {}),
        ...(sourceKind ? { sourceKind } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, take);
    return json({
      items: page.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: rows.length > take ? page[page.length - 1]?.id ?? null : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
