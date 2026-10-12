import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env, assertSecretConfig } from "./env";
import { HttpError } from "./http";

async function pinataFile(bytes: Uint8Array, filename: string, type: string) {
  assertSecretConfig("ipfs");
  const form = new FormData();
  form.set("network", "public");
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  form.set("file", new Blob([copy], { type }), filename);
  const response = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.pinataJwt}` },
    body: form,
  });
  const payload = await response.json().catch(() => null) as { data?: { cid?: string }; error?: string } | null;
  if (!response.ok || !payload?.data?.cid) {
    throw new HttpError(payload?.error || `Pinata upload failed (${response.status})`, 502, "ipfs_failed");
  }
  return payload.data.cid;
}

export async function uploadMetadata(input: {
  image: Buffer;
  imageType: string;
  name: string;
  symbol: string;
  description: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}) {
  const imageCid = await pinataFile(input.image, "token-image", input.imageType);
  const metadata = {
    name: input.name,
    symbol: input.symbol,
    description: input.description,
    image: `https://ipfs.io/ipfs/${imageCid}`,
    twitter: input.twitter || undefined,
    telegram: input.telegram || undefined,
    website: input.website || undefined,
    showName: true,
  };
  const json = Buffer.from(JSON.stringify(metadata));
  const metadataCid = await pinataFile(json, "metadata.json", "application/json");
  return {
    imageCid,
    metadataCid,
    imageUrl: metadata.image,
    metadataUri: `https://ipfs.io/ipfs/${metadataCid}`,
    metadata,
  };
}

export async function copyToS3(bytes: Buffer, key: string, type: string) {
  if (!env.s3Endpoint || !env.s3Bucket || !env.s3AccessKey || !env.s3Secret) return null;
  const client = new S3Client({
    region: env.s3Region,
    endpoint: env.s3Endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: env.s3AccessKey, secretAccessKey: env.s3Secret },
  });
  await client.send(new PutObjectCommand({ Bucket: env.s3Bucket, Key: key, Body: bytes, ContentType: type }));
  return env.s3PublicBase ? `${env.s3PublicBase}/${key}` : null;
}
