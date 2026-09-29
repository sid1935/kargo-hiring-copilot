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
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <a
          href="/api/audit/export"
          className="rounded bg-neutral-900 text-white px-3 py-1.5 text-sm"
        >
          Export CSV
        </a>
      </div>
      <p className="text-sm text-neutral-500 mb-6">
        Every score, decision, note, and email is recorded here — the record Arjun never had.
      </p>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-neutral-200">
            <th className="py-2 pr-2">When</th>
            <th className="py-2 pr-2">Event</th>
            <th className="py-2 pr-2">Candidate</th>
            <th className="py-2 pr-2">Detail</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-neutral-100 align-top">
              <td className="py-2 pr-2 whitespace-nowrap text-neutral-500">
                {e.createdAt.toLocaleString()}
              </td>
              <td className="py-2 pr-2">{e.eventType}</td>
              <td className="py-2 pr-2">
                {e.candidate ? `${e.candidate.name} (${e.candidate.role})` : "—"}
              </td>
              <td className="py-2 pr-2 font-mono text-xs text-neutral-500 max-w-md truncate">
                {e.detail}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
