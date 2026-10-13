import { describe, expect, it } from "vitest";
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { assertLaunchTransaction, createPayload, tradePayload } from "../src/lib/solana/portal";
import { HttpError } from "../src/lib/http";
import { creationCostLines, VEIL_PLATFORM_FEE_SOL } from "../src/lib/fees";
import { moderationFailure } from "../src/lib/moderation";

describe("PumpPortal payloads", () => {
  const wallet = Keypair.generate().publicKey.toBase58();
  const mint = Keypair.generate().publicKey.toBase58();

  it("builds a create payload with the documented field names", () => {
    const body = createPayload({
      publicKey: wallet,
      mint,
      name: "Lumen",
      symbol: "LUMEN",
      uri: "https://ipfs.io/ipfs/bafytest",
      amount: 0,
      slippage: 10,
      priorityFee: 0.00005,
    });
    expect(body).toMatchObject({
      action: "create",
      denominatedInSol: "true",
      pool: "pump",
      amount: 0,
      tokenMetadata: { name: "Lumen", symbol: "LUMEN", uri: "https://ipfs.io/ipfs/bafytest" },
    });
    expect(body.mint).toBe(mint);
    expect(body.mint).not.toBe(wallet);
  });

  it("uses pump-amm only when the caller already knows the coin graduated", () => {
    const body = tradePayload({
      publicKey: wallet,
      mint,
      action: "sell",
      amount: "100%",
      denominatedInSol: false,
      slippage: 10,
      priorityFee: 0.00005,
      pool: "pump-amm",
    });
    expect(body.denominatedInSol).toBe("false");
    expect(body.amount).toBe("100%");
    expect(body.pool).toBe("pump-amm");
  });

  it("signs the mint before the fee payer would be added", () => {
    const mintKey = Keypair.generate();
    const payer = Keypair.generate();
    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: "11111111111111111111111111111111",
      instructions: [
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mintKey.publicKey,
          lamports: 1,
          space: 0,
          programId: SystemProgram.programId,
        }),
      ],
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);
    tx.sign([mintKey]);
    const mintIndex = tx.message.staticAccountKeys.findIndex((key) => key.equals(mintKey.publicKey));
    expect(tx.signatures[mintIndex].some((byte) => byte !== 0)).toBe(true);
    const payerIndex = tx.message.staticAccountKeys.findIndex((key) => key.equals(payer.publicKey));
    expect(tx.signatures[payerIndex].every((byte) => byte === 0)).toBe(true);
    tx.sign([payer]);
    expect(tx.signatures[payerIndex].some((byte) => byte !== 0)).toBe(true);
  });
});

describe("launch confirmation", () => {
  const payer = "payer111111111111111111111111111111111111";
  const mint = "mint1111111111111111111111111111111111111";

  it("accepts a confirmed transaction paid by the creator that includes the mint", () => {
    expect(() => assertLaunchTransaction({
      staticAccountKeys: [payer, mint],
      loadedKeys: [],
      signatures: ["sig"],
      expectedSignature: "sig",
      mint,
      payer,
    })).not.toThrow();
  });

  it("rejects a signature that does not belong to the signed-in wallet", () => {
    expect(() => assertLaunchTransaction({
      staticAccountKeys: ["other11111111111111111111111111111111111", mint],
      loadedKeys: [],
      signatures: ["sig"],
      expectedSignature: "sig",
      mint,
      payer,
    })).toThrow(HttpError);
  });
});

describe("fees and moderation", () => {
  it("discloses a zero VEIL fee and the published pump rates", () => {
    expect(VEIL_PLATFORM_FEE_SOL).toBe(0);
    const lines = creationCostLines({ devBuySol: 0.1, priorityFeeSol: 0.00005, networkFeeLamports: 5000 });
    expect(lines.find((line) => line.label === "VEIL fee")?.detail).toContain("0 SOL");
    expect(lines.map((line) => line.detail).join(" ")).toContain("1.25%");
    expect(lines.map((line) => line.detail).join(" ")).toContain("0.5%");
    expect(lines.map((line) => line.detail).join(" ")).not.toContain("0.011");
  });

  it("blocks brand impersonation", () => {
    expect(moderationFailure("Apple coin")).toMatch(/apple/i);
    expect(moderationFailure("a quiet lantern")).toBeNull();
  });
});
