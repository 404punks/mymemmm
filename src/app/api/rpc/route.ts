import { env, rpcProblem } from "@/lib/env";
import { assertSameOrigin, clientIp, errorResponse, HttpError } from "@/lib/http";
import { assertRate } from "@/lib/rate-limit";

const ALLOWED = new Set([
  "getBalance",
  "getLatestBlockhash",
  "getAccountInfo",
  "getMultipleAccounts",
  "getTransaction",
  "getSignatureStatuses",
  "getTokenAccountBalance",
  "getFeeForMessage",
  "getMinimumBalanceForRentExemption",
  "getTokenLargestAccounts",
]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertRate(`rpc:${clientIp(request)}`, 60);
    const problem = rpcProblem();
    if (problem) throw new HttpError(problem, 503, "rpc_unconfigured");
    const body = await request.json() as { method?: string } | { method?: string }[];
    const methods = Array.isArray(body) ? body.map((item) => item.method) : [body.method];
    if (methods.some((method) => !method || !ALLOWED.has(method))) {
      throw new HttpError("That RPC method is not proxied.", 403, "rpc_method");
    }
    const response = await fetch(env.solanaRpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return new Response(text, { status: response.status, headers: { "content-type": "application/json" } });
  } catch (error) {
    return errorResponse(error);
  }
}
