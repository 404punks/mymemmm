import { prisma } from "@/lib/db";
import { sessionUser } from "@/lib/auth";
import { assertRate } from "@/lib/api";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertRate(request, "notifications", 60);
    const user = await sessionUser(request.headers.get("cookie"));
    const rows = await prisma.notification.findMany({
      where: user ? { OR: [{ userId: user.id }, { userId: null }] } : { userId: null },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    return json({
      items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
