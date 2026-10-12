import { env, assertSecretConfig } from "@/lib/env";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

function sse(stream: ReadableStream) {
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

export async function GET(request: Request) {
  try {
    const mint = new URL(request.url).searchParams.get("mint");
    if (!env.pumpPortalKey) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: "PUMPPORTAL_API_KEY is not set. The data websocket stays on the server, and VEIL does not invent a trade tape." })}\n\n`));
          controller.close();
        },
      });
      return sse(stream);
    }
    assertSecretConfig("portal-data");
    if (mint && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
      return new Response("Bad mint", { status: 400 });
    }
    const encoder = new TextEncoder();
    let socket: WebSocket | null = null;
    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        socket = new WebSocket(`wss://pumpportal.fun/api/data?api-key=${encodeURIComponent(env.pumpPortalKey)}`);
        socket.addEventListener("open", () => {
          socket?.send(JSON.stringify({ method: "subscribeMigration" }));
          if (mint) socket?.send(JSON.stringify({ method: "subscribeTokenTrade", keys: [mint] }));
          send("status", { connected: true, mint, metered: Boolean(mint) });
        });
        socket.addEventListener("message", (event) => {
          try {
            const payload = JSON.parse(String(event.data));
            if (mint && payload?.mint && payload.mint !== mint) return;
            send("trade", payload);
          } catch {
            send("error", { message: "PumpPortal sent a message that was not JSON." });
          }
        });
        socket.addEventListener("error", () => send("error", { message: "PumpPortal websocket failed." }));
        socket.addEventListener("close", () => {
          send("status", { connected: false });
          controller.close();
        });
      },
      cancel() {
        socket?.close();
      },
    });
    return sse(stream);
  } catch (error) {
    return errorResponse(error);
  }
}
