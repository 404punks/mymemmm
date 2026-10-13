import { prisma } from "@/lib/db";
import { env, rpcProblem } from "@/lib/env";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = error instanceof Error ? error.message : "unavailable";
  }
  return json({
    service: "veil",
    cluster: "mainnet-beta",
    database,
    aiConfigured: Boolean(env.anthropicKey),
    ipfsConfigured: Boolean(env.pinataJwt),
    rpcConfigured: !rpcProblem(),
    portalDataConfigured: Boolean(env.pumpPortalKey),
    holderSource: env.birdeyeKey ? "birdeye" : "largest-accounts-only",
    veilFeeSol: 0,
    generatedAt: new Date().toISOString(),
  });
}
