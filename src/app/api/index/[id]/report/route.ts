import { prisma } from "@/lib/db";
import { assertRate } from "@/lib/api";
import { errorResponse, json, HttpError } from "@/lib/http";
import { reportSchema } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertRate(request, "report", 8);
    const { id } = await context.params;
    const row = await prisma.indexRecord.findUnique({ where: { id } });
    if (!row) throw new HttpError("Index record not found", 404, "not_found");
    const body = reportSchema.parse(await request.json());
    const report = await prisma.indexReport.create({
      data: { recordId: id, reason: body.reason, details: body.details, reporter: body.reporter },
    });
    return json({ id: report.id, status: "received" });
  } catch (error) {
    return errorResponse(error);
  }
}
