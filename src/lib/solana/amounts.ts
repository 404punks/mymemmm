import BN from "bn.js";

export function decimalToBase(value: string, decimals: number): BN {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("Amount must be a positive decimal");
  }
  const [whole, frac = ""] = value.split(".");
  if (frac.length > decimals) {
    throw new Error(`Use at most ${decimals} decimal places`);
  }
  const base = (frac + "0".repeat(decimals)).slice(0, decimals);
  return new BN(whole).mul(new BN(10).pow(new BN(decimals))).add(new BN(base || "0"));
}

export function solToLamports(value: string) {
  return decimalToBase(value, 9);
}

export function tokenToBase(value: string) {
  return decimalToBase(value, 6);
}
