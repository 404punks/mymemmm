import { consumeNonce } from "@/lib/auth";
import { assertSameOrigin, clientIp, errorResponse, json } from "@/lib/http";
import { assertRate } from "@/lib/rate-limit";
import { verifySchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertRate(`verify:${clientIp(request)}`, 20);
    const body = verifySchema.parse(await request.json());
    return json(await consumeNonce(body.address, body.nonce, body.signature));
  } catch (error) {
    return errorResponse(error);
  }
}
