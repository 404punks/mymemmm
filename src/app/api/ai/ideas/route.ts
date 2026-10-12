import { assertRate } from "@/lib/api";
import { draftTokenIdeas } from "@/lib/ai/workflows";
import { errorResponse, json } from "@/lib/http";
import { ideaSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertRate(request, "ideas", 12);
    const body = ideaSchema.parse(await request.json());
    return json(await draftTokenIdeas(body.concept, body.tone));
  } catch (error) {
    return errorResponse(error);
  }
}
