export function shortAddress(value: string, size = 4): string {
  if (value.length <= size * 2 + 1) return value;
  return `${value.slice(0, size)}…${value.slice(-size)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatWhen(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ageLabel(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const delta = Date.now() - date.getTime();
  if (!Number.isFinite(delta)) return "unknown";
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function lamportsToSol(lamports: string | number): string {
  const value = typeof lamports === "string" ? Number(lamports) : lamports;
  if (!Number.isFinite(value)) return "—";
  return (value / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function baseUnitsToUi(amount: string, decimals = 6): string {
  if (!/^\d+$/.test(amount)) return "—";
  const negative = false;
  const padded = amount.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const frac = padded.slice(-decimals).replace(/0+$/, "");
  const text = frac ? `${whole}.${frac}` : whole;
  return negative ? `-${text}` : text;
}

export function explorerTx(signature: string, network: string): string {
  const cluster = network === "devnet" ? "?cluster=devnet" : "";
  return `https://solscan.io/tx/${signature}${cluster}`;
}

export function explorerAddress(address: string, network: string): string {
  const cluster = network === "devnet" ? "?cluster=devnet" : "";
  return `https://solscan.io/account/${address}${cluster}`;
}

export function isBase58Address(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}
