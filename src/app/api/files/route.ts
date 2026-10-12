import { assertRate } from "@/lib/api";
import { saveUpload } from "@/lib/storage";
import { errorResponse, json, HttpError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertRate(request, "upload", 20);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError("Choose an image file", 400, "file_required");
    return json(await saveUpload(file));
  } catch (error) {
    return errorResponse(error);
  }
}
