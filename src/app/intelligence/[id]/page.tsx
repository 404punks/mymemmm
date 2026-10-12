import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui";
import { ReportForm } from "@/components/report-form";
import { prisma } from "@/lib/db";
import { splitList } from "@/lib/lists";
import { formatWhen } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function IndexRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.indexRecord.findUnique({ where: { id }, include: { reports: true } });
  if (!row) notFound();
  return (
    <article className="space-y-4">
      <header>
        <div className="flex flex-wrap gap-2">
          <Badge>{row.sourceType}</Badge>
          {row.isDemo ? <Badge tone="warn">Sample</Badge> : <Badge tone="ok">{row.verificationStatus}</Badge>}
        </div>
        <h1 className="mt-2 font-display text-3xl">{row.name}</h1>
        <p className="mt-2 max-w-2xl text-paper-dim">{row.description}</p>
      </header>
      <dl className="panel grid gap-3 p-4 text-sm md:grid-cols-2">
        <div><dt className="text-paper-faint">Source</dt><dd><a className="text-cyan" href={row.sourceUrl}>{row.sourceUrl}</a></dd></div>
        <div><dt className="text-paper-faint">Provenance</dt><dd>{row.provenance}</dd></div>
        <div><dt className="text-paper-faint">Creator</dt><dd>{row.creator || "Not provided by the source"}</dd></div>
        <div><dt className="text-paper-faint">Model provider</dt><dd>{row.modelProvider || "Not verifiable from this record"}</dd></div>
        <div><dt className="text-paper-faint">Repository</dt><dd>{row.repoUrl ? <a className="text-cyan" href={row.repoUrl}>{row.repoUrl}</a> : "—"}</dd></div>
        <div><dt className="text-paper-faint">On-chain address</dt><dd>{row.onchainAddress ? <Link className="text-cyan" href={`/token/${row.onchainAddress}`}>{row.onchainAddress}</Link> : "None associated"}</dd></div>
        <div><dt className="text-paper-faint">First indexed</dt><dd>{formatWhen(row.firstIndexedAt)}</dd></div>
        <div><dt className="text-paper-faint">Last checked</dt><dd>{formatWhen(row.lastCheckedAt)} · {row.status}</dd></div>
        <div><dt className="text-paper-faint">Categories</dt><dd>{splitList(row.categories).join(", ") || "—"}</dd></div>
        <div><dt className="text-paper-faint">Capabilities</dt><dd>{splitList(row.capabilities).join(", ") || "—"}</dd></div>
      </dl>
      <ReportForm id={row.id} count={row.reports.length} />
    </article>
  );
}
