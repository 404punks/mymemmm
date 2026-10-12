import { prisma } from "@/lib/db";
import { sessionUser } from "@/lib/auth";
import { assertRate } from "@/lib/api";
import { readWalletPortfolio } from "@/lib/solana/external";
import { isValidPublicKey } from "@/lib/solana/cluster";
import { errorResponse, json, HttpError } from "@/lib/http";
import { clusterSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertRate(request, "portfolio", 20);
    const url = new URL(request.url);
    const address = url.searchParams.get("address") || "";
    const network = clusterSchema.parse(url.searchParams.get("network") || "devnet");
    if (!isValidPublicKey(address)) throw new HttpError("Connect a wallet to load a portfolio", 400, "wallet_required");
    const user = await sessionUser(request.headers.get("cookie"));
    const [chain, tokens, agents, activity] = await Promise.all([
      readWalletPortfolio(network, address),
      prisma.token.findMany({ where: { creatorAddress: address }, orderBy: { createdAt: "desc" }, take: 20 }),
      user && user.walletAddress === address
        ? prisma.agent.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" } })
        : Promise.resolve([]),
      prisma.activityEvent.findMany({
        where: { address },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);
    return json({
      authenticated: Boolean(user && user.walletAddress === address),
      chain,
      createdTokens: tokens.map((token) => ({
        mintAddress: token.mintAddress,
        name: token.name,
        symbol: token.symbol,
        status: token.status,
        network: token.network,
        isDemo: token.isDemo,
        signature: token.signature,
      })),
      agents: agents.map((agent) => ({ handle: agent.handle, name: agent.name, status: agent.status, published: agent.published })),
      activity: activity.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
