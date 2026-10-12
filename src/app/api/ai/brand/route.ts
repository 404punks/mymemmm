import { assertRate } from "@/lib/api";
import { generateBrand } from "@/lib/ai/workflows";
import { errorResponse, json } from "@/lib/http";
import { brandSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertRate(request, "brand", 10);
    const body = brandSchema.parse(await request.json());
    return json(await generateBrand(body.name, body.symbol, body.concept));
  } catch (error) {
    return errorResponse(error);
  }
}
