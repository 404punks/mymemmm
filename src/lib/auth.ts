import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { prisma } from "./db";
import { env } from "./env";
import { HttpError } from "./http";

const COOKIE = "np_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const NONCE_MS = 10 * 60 * 1000;

export function signInMessage(address: string, nonce: string, issued: string, expires: string) {
  return [
    "NEURALPAD sign-in",
    "This signature only authenticates this browser session.",
    "It does not authorize token creation, trades, or spending.",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued: ${issued}`,
    `Expires: ${expires}`,
  ].join("\n");
}

function hashToken(token: string) {
  return createHash("sha256").update(`${env.authSecret}:${token}`).digest("hex");
}

export function sessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MS / 1000}${secure}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function readCookie(header: string | null, name = COOKIE) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

export async function issueNonce(address: string) {
  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(address);
  } catch {
    throw new HttpError("Address is not a Solana public key", 400, "bad_address");
  }
  const canonical = pubkey.toBase58();
  const nonce = randomBytes(16).toString("hex");
  const issued = new Date();
  const expiresAt = new Date(issued.getTime() + NONCE_MS);
  const message = signInMessage(canonical, nonce, issued.toISOString(), expiresAt.toISOString());
  await prisma.authNonce.create({
    data: { address: canonical, nonce, message, expiresAt },
  });
  return { address: canonical, nonce, message, expiresAt: expiresAt.toISOString() };
}

export function verifyWalletSignature(message: string, signature: string, address: string) {
  try {
    const key = new PublicKey(address);
    const sig = bs58.decode(signature);
    return nacl.sign.detached.verify(new TextEncoder().encode(message), sig, key.toBytes());
  } catch {
    return false;
  }
}

export async function consumeNonce(address: string, nonce: string, signature: string) {
  const row = await prisma.authNonce.findUnique({ where: { nonce } });
  if (!row || row.address !== address) {
    throw new HttpError("Nonce is unknown", 401, "bad_nonce");
  }
  if (row.usedAt) {
    throw new HttpError("Nonce was already used", 401, "replayed_nonce");
  }
  if (row.expiresAt.getTime() < Date.now()) {
    throw new HttpError("Nonce expired", 401, "expired_nonce");
  }
  if (!verifyWalletSignature(row.message, signature, address)) {
    throw new HttpError("Signature did not match the nonce message", 401, "bad_signature");
  }
  const marked = await prisma.authNonce.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (marked.count !== 1) {
    throw new HttpError("Nonce was already used", 401, "replayed_nonce");
  }
  const user = await prisma.user.upsert({
    where: { walletAddress: address },
    update: {},
    create: { walletAddress: address },
  });
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_MS),
    },
  });
  return { token, user };
}

export async function sessionUser(cookieHeader: string | null) {
  const token = readCookie(cookieHeader);
  if (!token) return null;
  const row = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return row.user;
}

export async function requireUser(cookieHeader: string | null) {
  const user = await sessionUser(cookieHeader);
  if (!user) throw new HttpError("Sign in with your wallet to continue", 401, "auth_required");
  return user;
}

export function secretsMatch(provided: string, expected: string) {
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
