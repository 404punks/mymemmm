import { avatarSvg } from "@/lib/brand";

export async function GET(_request: Request, context: { params: Promise<{ seed: string }> }) {
  const { seed } = await context.params;
  const safe = seed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "neuralpad";
  return new Response(avatarSvg(safe), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
