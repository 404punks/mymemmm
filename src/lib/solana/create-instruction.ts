import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { PUMP_PROGRAM_ID, PUMP_SDK } from "@pump-fun/pump-sdk";
import { assertCreateFields } from "./create-fields";

export async function buildCreateInstruction(input: {
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  creator: PublicKey;
  user: PublicKey;
  mayhemMode: boolean;
  holderReward: boolean;
}): Promise<TransactionInstruction> {
  assertCreateFields(input);
  if (input.creator.equals(PublicKey.default)) throw new Error("Creator cannot be the default public key");

  const instruction = await PUMP_SDK.createV2Instruction({
    mint: input.mint,
    name: input.name,
    symbol: input.symbol,
    uri: input.uri,
    creator: input.creator,
    user: input.user,
    mayhemMode: input.mayhemMode,
    holderReward: input.holderReward,
    cashback: false,
  });

  if (!instruction.programId.equals(PUMP_PROGRAM_ID)) {
    throw new Error("Pump SDK returned an unexpected program id");
  }
  return instruction;
}

export { PUMP_PROGRAM_ID };
