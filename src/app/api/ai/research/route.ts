import { prisma } from "@/lib/db";
import { assertRate } from "@/lib/api";
import { researchIndex } from "@/lib/ai/workflows";
import { errorResponse, json } from "@/lib/http";
import { researchSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertRate(request, "research", 12);
    const body = researchSchema.parse(await request.json());
    const agent = body.agentHandle
      ? await prisma.agent.findUnique({ where: { handle: body.agentHandle } })
      : null;
    return json(await researchIndex(body.query, agent?.id));
  } catch (error) {
    return errorResponse(error);
  }
}
