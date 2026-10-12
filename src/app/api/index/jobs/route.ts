import { prisma } from "@/lib/db";
import { assertAdmin, assertRate } from "@/lib/api";
import { runIndexSource } from "@/lib/index/engine";
import { errorResponse, json, HttpError } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await prisma.indexJob.findMany({ orderBy: { startedAt: "desc" }, take: 20 });
  return json({
    items: jobs.map((job) => ({
      ...job,
      startedAt: job.startedAt.toISOString(),
      finishedAt: job.finishedAt?.toISOString() ?? null,
    })),
  });
}

const bodySchema = z.object({ source: z.enum(["huggingface", "github", "mcp"]) });

export async function POST(request: Request) {
  try {
    assertRate(request, "index-job", 6);
    assertAdmin(request);
    const body = bodySchema.parse(await request.json());
    const job = await runIndexSource(body.source);
    return json({
      id: job.id,
      source: job.source,
      status: job.status,
      itemsAdded: job.itemsAdded,
      itemsUpdated: job.itemsUpdated,
      error: job.error,
    });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error);
    return errorResponse(error);
  }
}
