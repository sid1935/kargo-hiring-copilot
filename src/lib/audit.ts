import { prisma } from "./db";

export type AuditEventType =
  | "SCORED"
  | "DECIDED"
  | "EMAIL_DRAFTED"
  | "EMAIL_SENT"
  | "NOTE";

export async function logAudit(
  candidateId: string | null,
  eventType: AuditEventType,
  detail: Record<string, unknown>,
) {
  await prisma.auditEntry.create({
    data: {
      candidateId,
      eventType,
      detail: JSON.stringify(detail),
    },
  });
}

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function auditLogToCsv(): Promise<string> {
  const entries = await prisma.auditEntry.findMany({
    orderBy: { createdAt: "asc" },
    include: { candidate: { select: { name: true, role: true } } },
  });

  const header = [
    "timestamp",
    "event_type",
    "candidate_name",
    "candidate_role",
    "detail",
  ];
  const lines = [header.join(",")];

  for (const e of entries) {
    lines.push(
      [
        csvEscape(e.createdAt.toISOString()),
        csvEscape(e.eventType),
        csvEscape(e.candidate?.name ?? ""),
        csvEscape(e.candidate?.role ?? ""),
        csvEscape(e.detail),
      ].join(","),
    );
  }

  return lines.join("\n");
}
