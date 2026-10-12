import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <h1 style={{ fontFamily: "var(--font-display), serif" }}>Not on VEIL</h1>
      <p className="muted">That page or mint is not a confirmed launch.</p>
      <Link className="btn btn-gold" href="/explore">Back to explore</Link>
    </div>
  );
}
