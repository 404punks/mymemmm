import { listModels } from "@/lib/ai/providers";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ models: listModels() });
}
