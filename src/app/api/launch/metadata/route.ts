import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { readUpload } from "@/lib/files";
import { copyToS3, uploadMetadata } from "@/lib/ipfs";
import { env } from "@/lib/env";
import { assertSameOrigin, errorResponse, json, HttpError } from "@/lib/http";

const schema = z.object({
  draftId: z.string().min(8).max(40),
  imageFileId: z.string().min(8).max(40),
  mint: z.string().min(32).max(44),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const body = schema.parse(await request.json());
    const draft = await prisma.draft.findUnique({ where: { id: body.draftId } });
    if (!draft || draft.creatorWallet !== session.walletAddress) throw new HttpError("Draft not found", 404, "not_found");
    let mintAddress: string;
    try {
      mintAddress = new PublicKey(body.mint).toBase58();
    } catch {
      throw new HttpError("The mint address is not a Solana public key.", 400, "bad_mint");
    }
    const image = await readUpload(body.imageFileId);
    const character = JSON.parse(draft.characterJson) as { name: string };
    const storyLink = `${env.publicAppUrl}/token/${mintAddress}`;
    const suffix = `\n\nCharacter: ${character.name}. Read the sealed chapters on VEIL: ${storyLink}`;
    const description = `${draft.description.slice(0, Math.max(0, 800 - suffix.length))}${suffix}`.slice(0, 800);
    const uploaded = await uploadMetadata({
      image: image.bytes,
      imageType: image.type,
      name: draft.name,
      symbol: draft.symbol,
      description: description.slice(0, 800),
      twitter: draft.twitter || undefined,
      telegram: draft.telegram || undefined,
      website: draft.website || storyLink,
    });
    await copyToS3(image.bytes, `characters/${draft.id}`, image.type).catch((error: Error) => {
      throw new HttpError(error.message || "S3 copy failed", 502, "s3_failed");
    });
    await prisma.draft.update({
      where: { id: draft.id },
      data: { imageFileId: body.imageFileId, metadataUri: uploaded.metadataUri, imageCid: uploaded.imageCid },
    });
    return json({ metadataUri: uploaded.metadataUri, imageUrl: uploaded.imageUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
