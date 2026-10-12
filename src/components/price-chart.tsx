export function PriceChart({ points }: { points: { priceUsd: string | null; observedAt: string; source: string }[] }) {
  const values = points.filter((point) => point.priceUsd).map((point) => Number(point.priceUsd));
  if (values.length < 2) {
    return <p className="muted">No chart yet. VEIL only plots prices Dexscreener has actually returned, and it needs two observations.</p>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const path = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 280;
    const y = 80 - ((value - min) / span) * 70;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 280 90" role="img" aria-label="Observed price" style={{ width: "100%", height: 120 }}>
      <path d={path} fill="none" stroke="#F2B84B" strokeWidth="2" />
    </svg>
  );
}
