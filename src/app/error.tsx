"use client";

export default function ErrorView({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel p-8">
      <h1 className="font-display text-3xl">Something failed</h1>
      <p className="mt-2 text-sm text-paper-dim">{error.message || "The page could not be rendered."}</p>
      <button className="btn btn-ghost mt-4" onClick={reset}>Retry</button>
    </div>
  );
}
