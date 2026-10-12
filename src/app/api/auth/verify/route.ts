import { consumeNonce, sessionCookie } from "@/lib/auth";
import { assertRate } from "@/lib/api";
import { errorResponse, json } from "@/lib/http";
import { verifySchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertRate(request, "verify", 10);
    const body = verifySchema.parse(await request.json());
    const { token, user } = await consumeNonce(body.address, body.nonce, body.signature);
    const response = json({
      authenticated: true,
      walletAddress: user.walletAddress,
      note: "Wallet connection and this session are separate. The signature does not approve transactions.",
    });
    response.headers.set("Set-Cookie", sessionCookie(token));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
