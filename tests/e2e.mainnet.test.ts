import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import { fetchLocalTransaction, tradePayload } from "../src/lib/solana/portal";

const send = process.env.VEIL_E2E_SEND === "yes";
const armed = process.env.VEIL_E2E_CONFIRM === "spend-mainnet-sol";

describe("mainnet PumpPortal transaction bytes", () => {
  it("deserializes a real trade-local response and never broadcasts it from this suite", async () => {
    if (send || armed) {
      throw new Error("This suite does not broadcast. A funded mainnet send needs your review and a wallet you control.");
    }
    const mint = process.env.VEIL_E2E_MINT;
    if (!mint) return;
    const wallet = Keypair.generate();
    const bytes = await fetchLocalTransaction(tradePayload({
      publicKey: wallet.publicKey.toBase58(),
      mint,
      action: "buy",
      amount: 0.001,
      denominatedInSol: true,
      slippage: 10,
      priorityFee: 0.00005,
      pool: "pump",
    }));
    expect(bytes.byteLength).toBeGreaterThan(32);
  });
});
