import { createHash, randomBytes } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { env } from "./env";
import { HttpError } from "./http";

const COOKIE = "veil_session";
const TEN_MINUTES = 10 * 60 * 1000;
const SESSION_DAYS = 7;

function hash(value: string) {
  return createHash("sha256").update(`${env.authSecret}:${value}`).digest("hex");
}

export function signInMessage(address: string, nonce: string, issued: Date) {
  const expires = new Date(issued.getTime() + TEN_MINUTES);
  return [
    "VEIL wants you to sign in with your Solana account:",
    address,
    "",
    "This signature does not approve a transaction or spend SOL.",
    "",
    `Nonce: ${nonce}`,
    `Issued At: ${issued.toISOString()}`,
    `Expiration Time: ${expires.toISOString()}`,
  ].join("\n");
}

export async function issueNonce(address: string) {
  let wallet: PublicKey;
  try {
    wallet = new PublicKey(address);
  } catch {
    throw new HttpError("That is not a Solana address", 400, "bad_address");
  }
  const issued = new Date();
  const nonce = randomBytes(16).toString("hex");
  const message = signInMessage(wallet.toBase58(), nonce, issued);
  await prisma.authNonce.create({
    data: {
      walletAddress: wallet.toBase58(),
      nonce,
      message,
      expiresAt: new Date(issued.getTime() + TEN_MINUTES),
    },
  });
  return { nonce, message };
}

export async function consumeNonce(address: string, nonce: string, signature: string) {
  const row = await prisma.authNonce.findUnique({ where: { nonce } });
  if (!row || row.walletAddress !== address) throw new HttpError("Unknown sign-in nonce", 400, "bad_nonce");
  if (row.usedAt) throw new HttpError("This sign-in nonce was already used", 400, "nonce_used");
  if (row.expiresAt.getTime() < Date.now()) throw new HttpError("This sign-in nonce expired", 400, "nonce_expired");
  let ok = false;
  try {
    ok = nacl.sign.detached.verify(new TextEncoder().encode(row.message), bs58.decode(signature), new PublicKey(address).toBytes());
  } catch {
    ok = false;
  }
  if (!ok) throw new HttpError("Wallet signature did not match the sign-in message", 400, "bad_signature");
  await prisma.authNonce.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  const user = await prisma.user.upsert({
    where: { walletAddress: address },
    update: {},
    create: { walletAddress: address },
  });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId: user.id, tokenHash: hash(token), expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return { walletAddress: user.walletAddress };
}

export async function readSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return { walletAddress: session.user.walletAddress, userId: session.user.id };
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hash(token) } });
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function requireSession() {
  const session = await readSession();
  if (!session) throw new HttpError("Sign in with your wallet before continuing", 401, "auth_required");
  return session;
}
