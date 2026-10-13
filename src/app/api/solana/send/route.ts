import { VersionedTransaction } from "@solana/web3.js";
import { requireSession } from "@/lib/auth";
import { assertSameOrigin, clientIp, errorResponse, json, HttpError } from "@/lib/http";
import { assertRate } from "@/lib/rate-limit";
import { sendSchema } from "@/lib/validation";
import { fromBase64, getConnection, mapSendError } from "@/lib/solana/portal";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    assertRate(`send:${session.walletAddress}:${clientIp(request)}`, 20);
    const body = sendSchema.parse(await request.json());
    const raw = fromBase64(body.transaction);
    let tx: VersionedTransaction;
    try {
      tx = VersionedTransaction.deserialize(raw);
    } catch {
      throw new HttpError("The transaction bytes could not be read.", 400, "bad_transaction");
    }
    if (!tx.signatures.some((sig) => !sig.every((byte) => byte === 0))) {
      throw new HttpError("The transaction has no signatures.", 400, "unsigned");
    }
    const connection = getConnection();
    try {
      const signature = await connection.sendRawTransaction(raw, { skipPreflight: false, maxRetries: 3 });
      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        throw new HttpError(`The cluster rejected the transaction: ${JSON.stringify(confirmation.value.err)}`, 400, "tx_failed");
      }
      return json({ signature, confirmed: true });
    } catch (error) {
      if (error instanceof HttpError) throw error;
      const mapped = mapSendError(error instanceof Error ? error.message : "RPC send failed");
      throw new HttpError(mapped.message, 400, mapped.code);
    }
  } catch (error) {
    return errorResponse(error);
  }
}
