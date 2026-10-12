import { prisma } from "@/lib/db";
import { splitList } from "@/lib/lists";
import { errorResponse, json, HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const row = await prisma.indexRecord.findUnique({ where: { id }, include: { reports: true } });
    if (!row) throw new HttpError("Index record not found", 404, "not_found");
    return json({
      ...row,
      categories: splitList(row.categories),
      capabilities: splitList(row.capabilities),
      firstIndexedAt: row.firstIndexedAt.toISOString(),
      lastCheckedAt: row.lastCheckedAt.toISOString(),
      reports: row.reports.map((report) => ({ ...report, createdAt: report.createdAt.toISOString() })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
