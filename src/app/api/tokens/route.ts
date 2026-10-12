import { prisma } from "@/lib/db";
import { assertRate } from "@/lib/api";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertRate(request, "tokens", 60);
    const tokens = await prisma.token.findMany({ orderBy: { createdAt: "desc" }, take: 24 });
    return json({
      items: tokens.map((token) => ({
        ...token,
        createdAt: token.createdAt.toISOString(),
        updatedAt: token.updatedAt.toISOString(),
        aiSummaryAt: token.aiSummaryAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
