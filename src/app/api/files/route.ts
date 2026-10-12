import { saveUpload } from "@/lib/files";
import { moderateImage } from "@/lib/ai/story";
import { requireSession } from "@/lib/auth";
import { assertSameOrigin, clientIp, errorResponse, json } from "@/lib/http";
import { assertRate } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    assertRate(`file:${session.walletAddress}:${clientIp(request)}`, 12);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Choose an image file.", code: "bad_image" }, 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await saveUpload(bytes);
    await moderateImage(bytes, saved.type);
    return json(saved);
  } catch (error) {
    return errorResponse(error);
  }
}
