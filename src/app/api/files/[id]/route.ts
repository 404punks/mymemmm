import { readUpload } from "@/lib/files";
import { errorResponse } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const file = await readUpload(id);
    return new Response(file.bytes, {
      headers: { "content-type": file.type, "cache-control": "private, max-age=3600" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
