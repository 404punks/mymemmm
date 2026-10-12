import { prisma } from "@/lib/db";
import { assertRate } from "@/lib/api";
import { verifyConfirmedLaunch } from "@/lib/solana/market";
import { recordActivity, notify } from "@/lib/activity";
import { sessionUser } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { confirmSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertRate(request, "confirm", 20);
    const body = confirmSchema.parse(await request.json());
    const verification = await verifyConfirmedLaunch(body.network, body.mint, body.signature);
    const agent = body.agentHandle
      ? await prisma.agent.findUnique({ where: { handle: body.agentHandle } })
      : null;
    if (!verification.confirmed) {
      await prisma.token.upsert({
        where: { mintAddress: body.mint },
        update: { status: "failed", signature: body.signature, network: body.network },
        create: {
          mintAddress: body.mint,
          name: body.name,
          symbol: body.symbol,
          description: body.description,
          metadataUri: body.metadataUri,
          imageUrl: body.imageUrl,
          network: body.network,
          status: "failed",
          signature: body.signature,
          creatorSource: "unverified",
          agentId: agent?.id,
        },
      });
      return json({ confirmed: false, reason: verification.reason }, 200);
    }
    const token = await prisma.token.upsert({
      where: { mintAddress: body.mint },
      update: {
        status: "confirmed",
        signature: body.signature,
        creatorAddress: verification.creator,
        creatorSource: "bonding-curve account",
        bondingComplete: verification.complete,
        network: body.network,
        name: body.name,
        symbol: body.symbol,
        description: body.description,
        metadataUri: body.metadataUri,
        imageUrl: body.imageUrl,
      },
      create: {
        mintAddress: body.mint,
        name: body.name,
        symbol: body.symbol,
        description: body.description,
        metadataUri: body.metadataUri,
        imageUrl: body.imageUrl,
        network: body.network,
        status: "confirmed",
        signature: body.signature,
        creatorAddress: verification.creator,
        creatorSource: "bonding-curve account",
        bondingComplete: verification.complete,
        agentId: agent?.id,
      },
    });
    await recordActivity({
      kind: "token_created",
      title: `${token.symbol} confirmed on ${body.network}`,
      summary: `Mint ${token.mintAddress} was verified in a confirmed transaction.`,
      sourceKind: "onchain",
      href: `/token/${token.mintAddress}`,
      signature: body.signature,
      address: token.mintAddress,
    });
    const user = await sessionUser(request.headers.get("cookie"));
    if (user) {
      await notify({
        userId: user.id,
        title: "Token creation confirmed",
        body: token.symbol,
        href: `/token/${token.mintAddress}`,
      });
    }
    return json({ confirmed: true, mint: token.mintAddress, creator: verification.creator, slot: verification.slot });
  } catch (error) {
    return errorResponse(error);
  }
}
