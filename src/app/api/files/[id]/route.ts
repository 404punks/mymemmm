import { readFile } from "node:fs/promises";
import { readStoredFile } from "@/lib/storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const stored = await readStoredFile(id);
  if (!stored) return new Response("Not found", { status: 404 });
  const bytes = await readFile(stored.absolute);
  return new Response(bytes, {
    headers: {
      "Content-Type": stored.row.mime,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
