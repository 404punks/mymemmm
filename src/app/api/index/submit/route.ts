import { assertRate } from "@/lib/api";
import { submitUserRecord } from "@/lib/index/engine";
import { recordActivity } from "@/lib/activity";
import { errorResponse, json, HttpError } from "@/lib/http";
import { submitIndexSchema } from "@/lib/validation";
import { normalizePublicUrl } from "@/lib/urls";

export async function POST(request: Request) {
  try {
    assertRate(request, "index-submit", 8);
    const body = submitIndexSchema.parse(await request.json());
    let sourceUrl: string;
    try {
      sourceUrl = normalizePublicUrl(body.sourceUrl);
    } catch (error) {
      throw new HttpError(error instanceof Error ? error.message : "Invalid URL", 400, "bad_url");
    }
    const result = await submitUserRecord({
      externalId: sourceUrl,
      name: body.name,
      description: body.description,
      sourceUrl,
      sourceType: body.sourceType,
      creator: body.creator,
      categories: body.categories,
      capabilities: body.capabilities,
      modelProvider: body.modelProvider,
      repoUrl: body.repoUrl || undefined,
      onchainAddress: body.onchainAddress,
      provenance: "User submission. The URL was validated and stored. NEURALPAD did not fetch private data.",
      verificationStatus: "user-submitted",
    });
    await recordActivity({
      kind: "index_update",
      title: "User submission indexed",
      summary: `${body.name} was stored as a user-submitted record (${result}).`,
      sourceKind: "system",
      href: "/intelligence",
    });
    return json({ status: result, verificationStatus: "user-submitted" });
  } catch (error) {
    return errorResponse(error);
  }
}
