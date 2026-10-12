import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { prisma } from "./db";
import { HttpError } from "./http";

const ROOT = path.join(process.cwd(), "data", "uploads");
const ALLOWED = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/svg+xml", "svg"],
]);

const MAX_BYTES = 2 * 1024 * 1024;

export async function saveUpload(file: File) {
  const ext = ALLOWED.get(file.type);
  if (!ext) throw new HttpError("Upload a PNG, JPEG, WebP, GIF, or SVG image", 400, "bad_mime");
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new HttpError("Images must be between 1 byte and 2 MB", 400, "bad_size");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (file.type === "image/svg+xml") {
    const text = bytes.toString("utf8").toLowerCase();
    if (text.includes("<script") || text.includes("onload=") || text.includes("javascript:")) {
      throw new HttpError("SVG images cannot contain scripts", 400, "bad_svg");
    }
  }
  if (file.type === "image/png" && bytes.subarray(0, 4).toString("hex") !== "89504e47") {
    throw new HttpError("File content does not match PNG", 400, "bad_content");
  }
  if (file.type === "image/jpeg" && !(bytes[0] === 0xff && bytes[1] === 0xd8)) {
    throw new HttpError("File content does not match JPEG", 400, "bad_content");
  }
  await mkdir(ROOT, { recursive: true });
  const id = nanoid(16);
  const filename = `${id}.${ext}`;
  await writeFile(path.join(ROOT, filename), bytes);
  await prisma.storedFile.create({
    data: { id, filename, mime: file.type, bytes: bytes.length },
  });
  return { id, mime: file.type, bytes: bytes.length, url: `/api/files/${id}` };
}

export async function readStoredFile(id: string) {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(id)) return null;
  const row = await prisma.storedFile.findUnique({ where: { id } });
  if (!row) return null;
  return { row, absolute: path.join(ROOT, row.filename) };
}

export async function saveGeneratedSvg(svg: string) {
  const file = new File([svg], "mark.svg", { type: "image/svg+xml" });
  return saveUpload(file);
}
