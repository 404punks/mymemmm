import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { HttpError } from "./http";

const ROOT = path.join(process.cwd(), "data", "uploads");
const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function sniffImage(bytes: Buffer): string | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (bytes.length > 6 && (bytes.toString("ascii", 0, 6) === "GIF87a" || bytes.toString("ascii", 0, 6) === "GIF89a")) return "image/gif";
  return null;
}

export async function saveUpload(bytes: Buffer) {
  if (bytes.length < 32 || bytes.length > 1_500_000) throw new HttpError("Image must be between 32 bytes and 1.5 MB.", 400, "bad_image");
  const type = sniffImage(bytes);
  if (!type) throw new HttpError("Upload a PNG, JPEG, WebP, or GIF.", 400, "bad_image");
  const id = nanoid(16);
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, `${id}.${TYPES[type]}`), bytes);
  await writeFile(path.join(ROOT, `${id}.json`), JSON.stringify({ type }));
  return { id, type };
}

export async function readUpload(id: string) {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(id)) throw new HttpError("Unknown image", 404, "not_found");
  const meta = JSON.parse(await readFile(path.join(ROOT, `${id}.json`), "utf8")) as { type: string };
  const ext = TYPES[meta.type];
  if (!ext) throw new HttpError("Unknown image", 404, "not_found");
  const bytes = await readFile(path.join(ROOT, `${id}.${ext}`));
  return { bytes, type: meta.type };
}
