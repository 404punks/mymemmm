"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page">
      <h1 style={{ fontFamily: "var(--font-display), serif" }}>Something failed</h1>
      <p className="rose" role="alert">{error.message}</p>
      <button className="btn" onClick={reset}>Try again</button>
    </div>
  );
}
