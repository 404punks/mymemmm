import { prisma } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const doc = await prisma.metadataDocument.findUnique({ where: { id } });
  if (!doc) return Response.json({ error: "Metadata not found" }, { status: 404 });
  return new Response(doc.payload, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
