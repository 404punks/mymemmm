import { prisma } from "@/lib/db";
import { splitList } from "@/lib/lists";
import { errorResponse, json, HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ handle: string }> }) {
  try {
    const { handle } = await context.params;
    const agent = await prisma.agent.findUnique({
      where: { handle },
      include: {
        tokens: true,
        activities: { orderBy: { createdAt: "desc" }, take: 12 },
      },
    });
    if (!agent || !agent.published) throw new HttpError("Agent not found", 404, "not_found");
    return json({
      ...agent,
      skills: splitList(agent.skills),
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
      lastActiveAt: agent.lastActiveAt?.toISOString() ?? null,
      activities: agent.activities.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
      tokens: agent.tokens.map((token) => ({
        ...token,
        createdAt: token.createdAt.toISOString(),
        updatedAt: token.updatedAt.toISOString(),
        aiSummaryAt: token.aiSummaryAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
