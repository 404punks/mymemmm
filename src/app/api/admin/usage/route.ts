import { prisma } from "@/lib/db";
import { assertAdmin } from "@/lib/api";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertAdmin(request);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await prisma.usageLedger.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 50 });
    const total = rows.reduce((sum, row) => sum + Number(row.estimatedCostUsd), 0);
    return json({
      windowHours: 24,
      requests: rows.length,
      estimatedCostUsd: total.toFixed(6),
      items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
