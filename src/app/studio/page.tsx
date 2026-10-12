import { IdeaStudio } from "@/components/idea-studio";

export const metadata = { title: "Token idea studio" };

export default function StudioPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Token idea studio</h1>
      <p className="max-w-2xl text-sm text-paper-dim">Draft names, copy, and image prompts. Every result stays editable. Nothing here creates a mint.</p>
      <IdeaStudio />
    </div>
  );
}
