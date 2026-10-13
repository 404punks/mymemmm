import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CharacterPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const token = await prisma.token.findUnique({ where: { mint }, include: { character: true, chapters: { orderBy: { index: "asc" } } } });
  if (!token?.character) notFound();
  return (
    <div className="page">
      <p className="kicker">{token.symbol}</p>
      <h1 style={{ fontFamily: "var(--font-display), serif", fontSize: 56 }}>{token.character.name}</h1>
      <p style={{ fontSize: 20 }}>{token.character.epithet}</p>
      <img src={token.imageUrl} alt="" width={160} height={160} style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 24 }} />
      <p>{token.character.premise}</p>
      <p className="muted">Voice. {token.character.voice}</p>
      <p className="muted">Appearance. {token.character.appearance}</p>
      <h2>Chapter list</h2>
      <ul>
        {token.chapters.map((chapter) => <li key={chapter.index}>{chapter.title} · opens at {chapter.minTokens} tokens</li>)}
      </ul>
      <p className="muted">Chapter text is not on this page. It is served from the coin page only when the signed-in balance qualifies.</p>
      <Link className="btn btn-gold" href={`/token/${token.mint}`}>Open the coin</Link>
    </div>
  );
}
