import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { assertSameOrigin, clientIp, errorResponse, json, HttpError } from "@/lib/http";
import { assertRate } from "@/lib/rate-limit";
import { assertClean } from "@/lib/moderation";
import { reportSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    assertRate(`report:${clientIp(request)}`, 10);
    const session = await readSession();
    const body = reportSchema.parse(await request.json());
    assertClean([body.detail]);
    const token = await prisma.token.findUnique({ where: { mint: body.mint } });
    if (!token) throw new HttpError("This mint is not a VEIL launch.", 404, "not_found");
    const report = await prisma.report.create({
      data: { mint: body.mint, wallet: session?.walletAddress ?? null, reason: body.reason, detail: body.detail },
    });
    return json({ id: report.id });
  } catch (error) {
    return errorResponse(error);
  }
}
