import { IndexBrowser } from "@/components/index-browser";

export const metadata = { title: "Intelligence Index" };

export default function IndexPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-3xl">Intelligence index</h1>
        <p className="mt-1 max-w-2xl text-sm text-paper-dim">Public Hugging Face, GitHub, and MCP registry rows can be fetched by a job. Sample rows are labeled. The browser never loads the full table at once.</p>
      </header>
      <IndexBrowser />
    </div>
  );
}
