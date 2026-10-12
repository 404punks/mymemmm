import { prisma } from "../db";
import { log } from "../log";
import { recordActivity } from "../activity";
import { adapters, type AdapterName } from "./adapters";
import { toIndexData, type NormalizedRecord } from "./normalize";
import { HttpError } from "../http";

async function upsertRecord(record: NormalizedRecord) {
  const data = toIndexData(record);
  const existing = await prisma.indexRecord.findUnique({ where: { sourceId: data.sourceId } });
  if (!existing) {
    await prisma.indexRecord.create({ data });
    return "added" as const;
  }
  const changed = existing.contentHash !== data.contentHash;
  await prisma.indexRecord.update({
    where: { sourceId: data.sourceId },
    data: {
      ...data,
      firstIndexedAt: existing.firstIndexedAt,
      lastCheckedAt: new Date(),
    },
  });
  return changed ? ("updated" as const) : ("unchanged" as const);
}

export async function runIndexSource(source: AdapterName) {
  const running = await prisma.indexJob.findFirst({
    where: { source, status: "running", startedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (running) {
    throw new HttpError("An indexing job for this source is already running", 409, "job_running");
  }
  const job = await prisma.indexJob.create({ data: { source, status: "running" } });
  const cursor = await prisma.indexCursor.findUnique({ where: { source } });
  try {
    const page = await adapters[source](cursor?.cursor ?? undefined);
    let itemsAdded = 0;
    let itemsUpdated = 0;
    for (const record of page.records) {
      try {
        const result = await upsertRecord(record);
        if (result === "added") itemsAdded += 1;
        if (result === "updated") itemsUpdated += 1;
      } catch (error) {
        log("warn", "index.record_skipped", {
          source,
          message: error instanceof Error ? error.message : "invalid record",
        });
      }
    }
    await prisma.indexCursor.upsert({
      where: { source },
      update: { cursor: page.nextCursor ?? cursor?.cursor ?? null },
      create: { source, cursor: page.nextCursor ?? null },
    });
    const finished = await prisma.indexJob.update({
      where: { id: job.id },
      data: { status: "completed", itemsAdded, itemsUpdated, finishedAt: new Date(), cursor: page.nextCursor },
    });
    await recordActivity({
      kind: "index_update",
      title: `${source} index updated`,
      summary: `${itemsAdded} added, ${itemsUpdated} changed. Provenance stays on each row.`,
      sourceKind: "system",
      href: "/intelligence",
    });
    return finished;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Index job failed";
    await prisma.indexJob.update({
      where: { id: job.id },
      data: { status: "failed", error: message, finishedAt: new Date() },
    });
    await recordActivity({
      kind: "job_failed",
      title: `${source} index failed`,
      summary: message,
      sourceKind: "system",
      href: "/activity",
    });
    throw new HttpError(message, 502, "index_failed");
  }
}

export async function submitUserRecord(record: NormalizedRecord) {
  return upsertRecord(record);
}
