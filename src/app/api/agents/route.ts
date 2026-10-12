import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertRate } from "@/lib/api";
import { errorResponse, json } from "@/lib/http";
import { joinList, splitList } from "@/lib/lists";
import { agentInputSchema } from "@/lib/validation";
import { listModels } from "@/lib/ai/providers";
import { recordActivity, notify } from "@/lib/activity";
import { HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertRate(request, "agents", 60);
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || "";
    const category = url.searchParams.get("category") || "";
    const agents = await prisma.agent.findMany({
      where: {
        published: true,
        ...(category ? { category } : {}),
        ...(q ? { OR: [{ name: { contains: q } }, { handle: { contains: q.toLowerCase() } }] } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 24,
      include: { tokens: { take: 1 }, activities: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return json({
      items: agents.map((agent) => ({
        ...agent,
        skills: splitList(agent.skills),
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
        lastActiveAt: agent.lastActiveAt?.toISOString() ?? null,
        tokens: agent.tokens.map((token) => ({ mintAddress: token.mintAddress, symbol: token.symbol, name: token.name, isDemo: token.isDemo })),
        latestActivity: agent.activities[0]
          ? { ...agent.activities[0], createdAt: agent.activities[0].createdAt.toISOString() }
          : null,
        activities: undefined,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertRate(request, "agents-write", 20);
    const user = await requireUser(request.headers.get("cookie"));
    const input = agentInputSchema.parse(await request.json());
    if (input.providerId || input.modelId) {
      const allowed = listModels().some(
        (model) => model.provider === input.providerId && model.model === input.modelId && model.configured,
      );
      if (!allowed) {
        throw new HttpError("Choose a configured model from the server allowlist, or leave the model unset", 400, "model_unavailable");
      }
    }
    const existing = await prisma.agent.findUnique({ where: { handle: input.handle } });
    if (existing && (existing.isDemo || (existing.ownerId && existing.ownerId !== user.id))) {
      throw new HttpError("That handle is already registered", 409, "handle_taken");
    }
    const status = input.providerId && input.modelId ? "active" : "paused";
    const agent = await prisma.agent.upsert({
      where: { handle: input.handle },
      update: {
        name: input.name,
        description: input.description,
        category: input.category,
        personality: input.personality,
        skills: joinList(input.skills),
        providerId: input.providerId || null,
        modelId: input.modelId || null,
        systemPrompt: input.systemPrompt,
        dailyLimit: input.dailyLimit,
        published: input.publish,
        status: input.publish ? status : "paused",
        avatarSeed: input.avatarSeed || input.handle,
        ownerId: user.id,
      },
      create: {
        handle: input.handle,
        name: input.name,
        description: input.description,
        category: input.category,
        personality: input.personality,
        skills: joinList(input.skills),
        providerId: input.providerId || null,
        modelId: input.modelId || null,
        systemPrompt: input.systemPrompt,
        dailyLimit: input.dailyLimit,
        published: input.publish,
        status: input.publish ? status : "paused",
        avatarSeed: input.avatarSeed || input.handle,
        ownerId: user.id,
        autonomy: "user-operated-assistant",
      },
    });
    if (input.tokenMint) {
      const token = await prisma.token.findUnique({ where: { mintAddress: input.tokenMint } });
      if (token) {
        await prisma.token.update({ where: { id: token.id }, data: { agentId: agent.id } });
      }
    }
    if (input.publish) {
      await recordActivity({
        kind: "agent_published",
        title: `${agent.name} profile published`,
        summary: "A user-operated assistant profile was published. This is not an autonomous agent.",
        sourceKind: "system",
        href: `/agents/${agent.handle}`,
      });
      await notify({ userId: user.id, title: "Agent profile published", body: agent.name, href: `/agents/${agent.handle}` });
    }
    return json({ handle: agent.handle, status: agent.status, autonomy: agent.autonomy, published: agent.published });
  } catch (error) {
    return errorResponse(error);
  }
}
