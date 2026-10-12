import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { listModels } from "@/lib/ai/providers";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = "ok";
  try {
    await prisma.user.count();
  } catch {
    database = "unavailable";
  }
  const models = listModels();
  return json({
    service: "neuralpad",
    database,
    aiConfigured: models.some((model) => model.configured),
    models: models.map((model) => ({ provider: model.provider, model: model.model, configured: model.configured })),
    solana: {
      defaultNetwork: env.defaultNetwork,
      devnetRpc: Boolean(env.solanaRpcUrl),
      mainnetEnabled: env.allowMainnet,
      mainnetRpc: Boolean(env.solanaRpcUrlMainnet),
    },
    generatedAt: new Date().toISOString(),
  });
}
