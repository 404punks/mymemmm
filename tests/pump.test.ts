import { createRequire } from "node:module";
import { Keypair, PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { assertCreateFields } from "../src/lib/solana/create-fields";

const require = createRequire(import.meta.url);
const sdk = require("@pump-fun/pump-sdk") as {
  PUMP_SDK: {
    createV2Instruction: (input: {
      mint: PublicKey;
      name: string;
      symbol: string;
      uri: string;
      creator: PublicKey;
      user: PublicKey;
      mayhemMode: boolean;
      holderReward: boolean;
      cashback: boolean;
    }) => Promise<TransactionInstruction>;
  };
  PUMP_PROGRAM_ID: PublicKey;
};

describe("pump create_v2 instruction", () => {
  it("targets the official program and includes the mint as a signer", async () => {
    const mint = Keypair.generate();
    const user = Keypair.generate();
    const instruction = await sdk.PUMP_SDK.createV2Instruction({
      mint: mint.publicKey,
      name: "Neural Test",
      symbol: "NTEST",
      uri: "https://example.com/m/neuraltest.json",
      creator: user.publicKey,
      user: user.publicKey,
      mayhemMode: false,
      holderReward: false,
      cashback: false,
    });

    expect(instruction.programId.equals(sdk.PUMP_PROGRAM_ID)).toBe(true);
    expect(instruction.programId.toBase58()).toBe("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
    expect(instruction.keys.length).toBeGreaterThanOrEqual(16);
    const mintKey = instruction.keys.find((key) => key.pubkey.equals(mint.publicKey));
    expect(mintKey?.isSigner).toBe(true);
    expect(Buffer.from(instruction.data).toString("utf8")).toContain("Neural Test");
    expect(Buffer.from(instruction.data).toString("utf8")).toContain("NTEST");
  });

  it("rejects an oversized metadata uri before a transaction is built", () => {
    expect(() => assertCreateFields({ name: "Too Long", symbol: "LONG", uri: `https://example.com/${"a".repeat(220)}` })).toThrow(/200/);
  });
});
