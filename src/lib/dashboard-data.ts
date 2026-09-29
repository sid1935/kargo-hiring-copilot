import { prisma } from "./db";
import type { Areas, Band, CandidateRole, DecisionType } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface EmailView {
  id: string;
  type: "INVITE" | "DECLINE" | "HOLDING";
  subject: string;
  body: string;
  status: "DRAFT" | "SENT";
  sentAt: string | null;
}

export interface CandidateView {
  id: string;
  name: string;
  email: string | null;
  role: CandidateRole;
  sourceFile: string;
  appliedAt: string;
  currentDecision: DecisionType | null;
  decidedAt: string | null;
  note: string | null;
  score: {
    areas: Areas;
    gatePassed: boolean;
    total: number;
    band: Band;
    summary: string;
    interviewQuestions: string[];
  } | null;
  emails: EmailView[];
  flags: string[];
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / DAY_MS);
}

function computeFlags(c: {
  currentDecision: string | null;
  decidedAt: Date | null;
  appliedAt: Date;
  emails: { type: string; status: string; sentAt: Date | null }[];
}): string[] {
  const flags: string[] = [];

  if (!c.currentDecision && daysSince(c.appliedAt) >= 5) {
    flags.push(`Waiting ${daysSince(c.appliedAt)} days with no decision`);
  }

  if (c.currentDecision === "ADVANCE") {
    const invite = c.emails.find((e) => e.type === "INVITE" && e.status === "SENT");
    if (invite?.sentAt && daysSince(invite.sentAt) >= 3) {
      flags.push(`Invite sent ${daysSince(invite.sentAt)} days ago — check if they've booked`);
    }
  }

  if (c.currentDecision === "HOLD" && c.decidedAt && daysSince(c.decidedAt) >= 7) {
    const holdingSent = c.emails.some((e) => e.type === "HOLDING" && e.status === "SENT");
    if (!holdingSent) {
      flags.push(`On hold ${daysSince(c.decidedAt)} days — send the "still reviewing" note`);
    }
  }

  return flags;
}

export async function getCandidateViews(): Promise<CandidateView[]> {
  const candidates = await prisma.candidate.findMany({
    include: { score: true, emails: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  return candidates.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    role: c.role as CandidateRole,
    sourceFile: c.sourceFile,
    appliedAt: c.appliedAt.toISOString(),
    currentDecision: (c.currentDecision as DecisionType) ?? null,
    decidedAt: c.decidedAt?.toISOString() ?? null,
    note: c.note,
    score: c.score
      ? {
          areas: JSON.parse(c.score.areas) as Areas,
          gatePassed: c.score.gatePassed,
          total: c.score.total,
          band: c.score.band as Band,
          summary: c.score.summary,
          interviewQuestions: JSON.parse(c.score.interviewQuestions) as string[],
        }
      : null,
    emails: c.emails.map((e) => ({
      id: e.id,
      type: e.type as EmailView["type"],
      subject: e.subject,
      body: e.body,
      status: e.status as EmailView["status"],
      sentAt: e.sentAt?.toISOString() ?? null,
    })),
    flags: computeFlags(c),
  }));
}

export function sortForShortlist(a: CandidateView, b: CandidateView): number {
  return (b.score?.total ?? -1) - (a.score?.total ?? -1);
}
