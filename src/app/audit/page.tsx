import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const entries = await prisma.auditEntry.findMany({
    orderBy: { createdAt: "desc" },
    include: { candidate: { select: { name: true, role: true } } },
    take: 500,
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex justify-between items-center mb-1">
        <h1 className="font-display font-bold uppercase tracking-wide text-3xl">Audit Log</h1>
        <a
          href="/api/audit/export"
          className="rounded-sm bg-accent text-bg font-semibold px-3 py-1.5 text-sm hover:bg-accent-strong transition-colors"
        >
          Export CSV
        </a>
      </div>
      <p className="text-sm text-ink-soft mb-6">
        Every score, decision, note, and email is recorded here — the record Arjun never had.
      </p>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-line">
            <th className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">When</th>
            <th className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Event</th>
            <th className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Candidate</th>
            <th className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Detail</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-line align-top">
              <td className="py-2 pr-2 whitespace-nowrap text-ink-faint font-mono text-xs">
                {e.createdAt.toLocaleString("en-US")}
              </td>
              <td className="py-2 pr-2 text-teal font-semibold text-xs uppercase tracking-wide">
                {e.eventType}
              </td>
              <td className="py-2 pr-2 text-ink">
                {e.candidate ? `${e.candidate.name} (${e.candidate.role})` : "—"}
              </td>
              <td className="py-2 pr-2 font-mono text-xs text-ink-faint max-w-md truncate">
                {e.detail}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
