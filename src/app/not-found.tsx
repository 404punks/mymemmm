import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel p-8">
      <h1 className="font-display text-3xl">Not in the index</h1>
      <p className="mt-2 text-sm text-paper-dim">That page or record does not exist.</p>
      <Link href="/" className="btn btn-primary mt-4">Back to Discover</Link>
    </div>
  );
}
