import { PublicKey } from "@solana/web3.js";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { assertSameOrigin, errorResponse, json, HttpError } from "@/lib/http";
import { holderGoalForChapter } from "@/lib/tiers";
import { confirmSchema } from "@/lib/validation";
import { assertLaunchTransaction, getConnection } from "@/lib/solana/portal";
import { readCurve } from "@/lib/solana/chain";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const body = confirmSchema.parse(await request.json());
    if (body.creator !== session.walletAddress) throw new HttpError("The creator does not match the signed-in wallet.", 403, "wallet_mismatch");
    const draft = await prisma.draft.findUnique({ where: { id: body.draftId } });
    if (!draft || draft.creatorWallet !== session.walletAddress || !draft.metadataUri) throw new HttpError("Draft not found", 404, "not_found");
    const existing = await prisma.token.findUnique({ where: { mint: body.mint } });
    if (existing) return json({ confirmed: true, mint: existing.mint, signature: existing.signature });
    const connection = getConnection();
    const tx = await connection.getTransaction(body.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    if (!tx) throw new HttpError("The transaction is not confirmed yet. It is not a successful launch.", 409, "unconfirmed");
    if (tx.meta?.err) throw new HttpError("The cluster rejected the transaction. It is not a successful launch.", 400, "tx_failed");
    const mintKey = new PublicKey(body.mint);
    const accountKeys = tx.transaction.message.getAccountKeys({ accountKeysFromLookups: tx.meta?.loadedAddresses });
    assertLaunchTransaction({
      staticAccountKeys: accountKeys.staticAccountKeys.map((key) => key.toBase58()),
      loadedKeys: [...(tx.meta?.loadedAddresses?.writable ?? []), ...(tx.meta?.loadedAddresses?.readonly ?? [])].map((key) => key.toBase58()),
      signatures: tx.transaction.signatures,
      expectedSignature: body.signature,
      mint: mintKey.toBase58(),
      payer: session.walletAddress,
    });
    const mintInfo = await connection.getAccountInfo(mintKey);
    if (!mintInfo) throw new HttpError("The mint account does not exist yet. It is not a successful launch.", 409, "mint_missing");
    let curveCreator: string | null = null;
    let pool = "pump";
    try {
      const curve = await readCurve(body.mint);
      if (curve.found) {
        curveCreator = curve.creator;
        pool = curve.pool;
      }
    } catch {
      curveCreator = null;
    }
    const character = JSON.parse(draft.characterJson) as { name: string; epithet: string; premise: string; voice: string; appearance: string };
    const chapters = JSON.parse(draft.chaptersJson) as { title: string; body: string }[];
    const tiers = JSON.parse(draft.tierJson) as string[];
    const imageUrl = draft.imageCid ? `https://ipfs.io/ipfs/${draft.imageCid}` : `${env.publicAppUrl}/api/files/${draft.imageFileId}`;
    await prisma.token.create({
      data: {
        mint: body.mint,
        name: draft.name,
        symbol: draft.symbol,
        description: draft.description,
        imageUrl,
        metadataUri: draft.metadataUri,
        creatorWallet: session.walletAddress,
        curveCreator,
        twitter: draft.twitter,
        telegram: draft.telegram,
        website: draft.website,
        genre: draft.genre,
        signature: body.signature,
        devBuySol: body.devBuySol,
        poolAtLaunch: pool,
        graduated: pool === "pump-amm",
        nextHolderGoal: holderGoalForChapter(5, env.chapterHolderGoal, env.chapterHolderStep),
        character: { create: character },
        chapters: {
          create: chapters.map((chapter, index) => ({
            index: index + 1,
            title: chapter.title,
            body: chapter.body,
            minTokens: tiers[index] || "0",
            origin: "launch",
          })),
        },
      },
    });
    await prisma.draft.update({ where: { id: draft.id }, data: { status: "launched" } });
    return json({ confirmed: true, mint: body.mint, signature: body.signature });
  } catch (error) {
    return errorResponse(error);
  }
}
