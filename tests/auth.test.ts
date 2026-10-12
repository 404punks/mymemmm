import { execSync } from "node:child_process";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
});

describe("wallet session nonces", () => {
  it("accepts one signature and rejects a replay", async () => {
    const { issueNonce, consumeNonce } = await import("../src/lib/auth");
    const key = Keypair.generate();
    const address = key.publicKey.toBase58();
    const issued = await issueNonce(address);
    const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(issued.message), key.secretKey));
    const session = await consumeNonce(address, issued.nonce, signature);
    expect(session.user.walletAddress).toBe(address);
    await expect(consumeNonce(address, issued.nonce, signature)).rejects.toThrow(/already used/i);
  });
});
