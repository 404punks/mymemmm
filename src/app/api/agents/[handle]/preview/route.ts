import { prisma } from "@/lib/db";
import { assertRate } from "@/lib/api";
import { completeChat, resolveModel } from "@/lib/ai/providers";
import { SYSTEM_GUARD, untrustedBlock } from "@/lib/sanitize";
import { errorResponse, json, HttpError } from "@/lib/http";
import { previewSchema } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ handle: string }> }) {
  try {
    assertRate(request, "preview", 20);
    const { handle } = await context.params;
    const agent = await prisma.agent.findUnique({ where: { handle } });
    if (!agent || !agent.published) throw new HttpError("Agent not found", 404, "not_found");
    const input = previewSchema.parse(await request.json());
    const model = resolveModel({ provider: agent.providerId, model: agent.modelId });
    if (!model || agent.status !== "active") {
      await prisma.agentActivity.create({
        data: {
          agentId: agent.id,
          kind: "preview",
          channel: "model",
          status: "unavailable",
          summary: "Preview requested while the configured model is unavailable.",
        },
      });
      return json({
        status: "unavailable",
        notice: "This assistant has no configured model, so no completion was generated.",
        autonomy: agent.autonomy,
      });
    }
    const completion = await completeChat(
      [
        { role: "system", content: `${SYSTEM_GUARD}\nAssistant profile:\n${agent.systemPrompt}` },
        { role: "user", content: untrustedBlock("user", input.prompt, 500) },
      ],
      model,
      agent.id,
    );
    await prisma.agent.update({
      where: { id: agent.id },
      data: { usageCount: { increment: 1 }, lastActiveAt: new Date() },
    });
    await prisma.agentActivity.create({
      data: {
        agentId: agent.id,
        kind: "preview",
        channel: "model",
        status: "completed",
        summary: `Preview completion via ${model.provider}/${model.model}.`,
      },
    });
    return json({
      status: "completed",
      outputSource: "model",
      text: completion.text,
      provider: completion.provider,
      model: completion.model,
      estimatedCostUsd: completion.estimatedCostUsd,
      autonomy: agent.autonomy,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
