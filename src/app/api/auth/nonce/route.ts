import { issueNonce } from "@/lib/auth";
import { assertSameOrigin, clientIp, errorResponse, json } from "@/lib/http";
import { assertRate } from "@/lib/rate-limit";
import { nonceSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertRate(`nonce:${clientIp(request)}`, 20);
    const body = nonceSchema.parse(await request.json());
    return json(await issueNonce(body.address));
  } catch (error) {
    return errorResponse(error);
  }
}
