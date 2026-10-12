import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { assertRate } from "@/lib/api";
import { errorResponse, json, HttpError } from "@/lib/http";
import { metadataSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertRate(request, "metadata", 20);
    const body = metadataSchema.parse(await request.json());
    const image = body.imageFileId ? `${env.publicAppUrl}/api/files/${body.imageFileId}` : undefined;
    const banner = body.bannerFileId ? `${env.publicAppUrl}/api/files/${body.bannerFileId}` : undefined;
    const id = nanoid(12);
    const uri = `${env.publicAppUrl}/m/${id}`;
    if (uri.length > 200) {
      throw new HttpError("PUBLIC_APP_URL makes the metadata URI longer than 200 characters", 400, "uri_too_long");
    }
    const payload = {
      name: body.name,
      symbol: body.symbol,
      description: body.description,
      image,
      banner,
      showName: true,
      createdOn: env.publicAppUrl,
      website: body.website || undefined,
      twitter: body.twitter || undefined,
      telegram: body.telegram || undefined,
    };
    await prisma.metadataDocument.create({
      data: { id, payload: JSON.stringify(payload) },
    });
    return json({ id, uri, metadata: payload });
  } catch (error) {
    return errorResponse(error);
  }
}
