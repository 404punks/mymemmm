import { issueNonce } from "@/lib/auth";
import { assertRate } from "@/lib/api";
import { errorResponse, json } from "@/lib/http";
import { nonceSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertRate(request, "nonce", 10);
    const body = nonceSchema.parse(await request.json());
    return json(await issueNonce(body.address));
  } catch (error) {
    return errorResponse(error);
  }
}
