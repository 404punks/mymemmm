/**
 * Figures checked against primary sources on 12 October 2026.
 * pump.fun fees page, last updated 8 October 2026: https://pump.fun/docs/fees
 * PumpPortal local trading docs: https://pumpportal.fun/local-trading-api/trading-api
 * PumpPortal states a 0.5% fee per trade, calculated before slippage, excluding Solana and pump.fun fees.
 * PumpPortal's creation page says there is no additional fee for token creation; the trading fee applies to the dev buy.
 * VEIL adds no platform fee.
 */
export const FEE_SOURCES = {
  pumpFeesUpdated: "2026-10-08",
  pumpFeesUrl: "https://pump.fun/docs/fees",
  portalUrl: "https://pumpportal.fun/creation",
} as const;

export const VEIL_PLATFORM_FEE_SOL = 0;
export const PUMP_CREATE_PLATFORM_FEE_SOL = 0;
export const BONDING_CURVE_TOTAL_FEE_RATE = 0.0125;
export const PUMPPORTAL_TRADE_FEE_RATE = 0.005;
export const GRADUATION_FEE_SOL = 0.015;

export type CostLine = { label: string; detail: string };

export function creationCostLines(input: { devBuySol: number; priorityFeeSol: number; networkFeeLamports: number | null }): CostLine[] {
  const lines: CostLine[] = [
    {
      label: "VEIL fee",
      detail: "0 SOL. This site does not add a platform fee.",
    },
    {
      label: "pump.fun create fee",
      detail: "0 SOL platform fee. You still pay the Solana network fee and the rent deposit for new accounts. That rent is inside the transaction your wallet previews.",
    },
    {
      label: "Dev buy",
      detail: input.devBuySol > 0
        ? `${input.devBuySol} SOL of the coin, if you sign a buy. The bonding curve takes 1.25% of that trade (0.300% creator + 0.95% protocol). PumpPortal takes 0.5% on trades it builds. Those rates come out of the trade. They are not added again on top.`
        : "No dev buy. You can add one before signing.",
    },
    {
      label: "Priority fee you set",
      detail: `${input.priorityFeeSol} SOL. PumpPortal includes this in the transaction. It is not a VEIL charge.`,
    },
    {
      label: "Network fee",
      detail: input.networkFeeLamports == null
        ? "Unavailable until the RPC can price this exact message."
        : `${input.networkFeeLamports} lamports, from getFeeForMessage on the unsigned transaction.`,
    },
    {
      label: "Later graduation",
      detail: "0.015 SOL if a trade migrates the coin to PumpSwap. Not charged for creation itself.",
    },
  ];
  return lines;
}
