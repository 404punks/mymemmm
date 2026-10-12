import { prisma } from "@/lib/db";
import { writeLaunchStory } from "@/lib/ai/story";
import { requireSession } from "@/lib/auth";
import { assertClean } from "@/lib/moderation";
import { DEFAULT_MIN_TOKENS } from "@/lib/tiers";
import { assertSameOrigin, errorResponse, json, HttpError } from "@/lib/http";
import { assertRate } from "@/lib/rate-limit";
import { chapterEditSchema, draftSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    assertRate(`story:${session.walletAddress}`, 8);
    const body = draftSchema.parse(await request.json());
    assertClean([body.name, body.symbol, body.description, body.genre, body.twitter || "", body.telegram || "", body.website || ""]);
    const story = await writeLaunchStory(body);
    const tiers = body.tiers ?? [...DEFAULT_MIN_TOKENS];
    const draft = await prisma.draft.create({
      data: {
        creatorWallet: session.walletAddress,
        name: body.name,
        symbol: body.symbol.toUpperCase(),
        description: body.description,
        genre: body.genre,
        twitter: body.twitter || null,
        telegram: body.telegram || null,
        website: body.website || null,
        characterJson: JSON.stringify(story.character),
        chaptersJson: JSON.stringify(story.chapters),
        tierJson: JSON.stringify(tiers),
      },
    });
    return json({ draftId: draft.id, character: story.character, chapters: story.chapters, tiers });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    assertRate(`story-edit:${session.walletAddress}`, 20);
    const body = chapterEditSchema.parse(await request.json());
    assertClean([
      body.character.name, body.character.epithet, body.character.premise, body.character.voice, body.character.appearance,
      ...body.chapters.flatMap((chapter) => [chapter.title, chapter.body]),
    ]);
    const draft = await prisma.draft.findUnique({ where: { id: body.draftId } });
    if (!draft || draft.creatorWallet !== session.walletAddress) throw new HttpError("Draft not found", 404, "not_found");
    if (draft.status !== "draft") throw new HttpError("This draft was already launched", 409, "draft_closed");
    await prisma.draft.update({
      where: { id: draft.id },
      data: {
        characterJson: JSON.stringify(body.character),
        chaptersJson: JSON.stringify(body.chapters),
        ...(body.tiers ? { tierJson: JSON.stringify(body.tiers) } : {}),
      },
    });
    return json({ draftId: draft.id, character: body.character, chapters: body.chapters });
  } catch (error) {
    return errorResponse(error);
  }
}
