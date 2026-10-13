import { prisma } from "@/lib/db";
import { writeLaterChapter } from "@/lib/ai/story";
import { env } from "@/lib/env";
import { errorResponse, json, HttpError } from "@/lib/http";
import { holderCount } from "@/lib/market";
import { holderGoalForChapter, nextReadingTier } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!env.cronSecret || request.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
      throw new HttpError("Cron secret missing or incorrect.", 401, "cron_unauthorized");
    }
    const tokens = await prisma.token.findMany({ include: { chapters: true, character: true } });
    const results = [];
    for (const token of tokens) {
      const nextIndex = token.chapters.length + 1;
      const goal = token.nextHolderGoal ?? holderGoalForChapter(nextIndex, env.chapterHolderGoal, env.chapterHolderStep);
      if (!goal || !token.character) {
        results.push({ mint: token.mint, status: "skipped", detail: "No holder goal." });
        continue;
      }
      const holders = await holderCount(token.mint);
      if (!holders) {
        await prisma.chapterJob.create({ data: { mint: token.mint, status: "skipped", detail: "Holder count is not available, so no chapter was written." } });
        results.push({ mint: token.mint, status: "skipped", detail: "no holder count" });
        continue;
      }
      if (holders.count < goal) {
        results.push({ mint: token.mint, status: "waiting", detail: `${holders.count}/${goal}` });
        continue;
      }
      const chapter = await writeLaterChapter({
        name: token.name,
        symbol: token.symbol,
        premise: token.character.premise,
        priorTitles: token.chapters.map((item) => item.title),
        index: nextIndex,
      });
      const minTokens = nextReadingTier(token.chapters);
      await prisma.chapter.create({
        data: { mint: token.mint, index: nextIndex, title: chapter.title, body: chapter.body, minTokens, origin: "milestone" },
      });
      const following = holderGoalForChapter(nextIndex + 1, env.chapterHolderGoal, env.chapterHolderStep);
      await prisma.token.update({ where: { mint: token.mint }, data: { nextHolderGoal: following } });
      await prisma.chapterJob.create({ data: { mint: token.mint, status: "written", detail: `Chapter ${nextIndex} at ${holders.count} holders.` } });
      results.push({ mint: token.mint, status: "written", detail: `chapter ${nextIndex}` });
    }
    return json({ results });
  } catch (error) {
    return errorResponse(error);
  }
}
