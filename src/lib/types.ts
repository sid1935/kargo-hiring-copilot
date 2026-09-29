export const ROLES = ["PM", "SPM"] as const;
export type CandidateRole = (typeof ROLES)[number];

export const DECISIONS = ["ADVANCE", "PASS", "HOLD"] as const;
export type DecisionType = (typeof DECISIONS)[number];

export const EMAIL_TYPES = ["INVITE", "DECLINE", "HOLDING"] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

export const EMAIL_STATUSES = ["DRAFT", "SENT"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const BANDS = ["Shortlist", "Second look", "Pass"] as const;
export type Band = (typeof BANDS)[number];

export const AREA_KEYS = [
  "operations_experience",
  "operations_to_software",
  "built_unasked_adopted",
  "ownership",
  "pressure_and_failures",
] as const;
export type AreaKey = (typeof AREA_KEYS)[number];

export interface AreaScore {
  score: number;
  evidence: string;
}

export type Areas = Record<AreaKey, AreaScore>;

export interface ScoreResult {
  areas: Areas;
  gatePassed: boolean;
  total: number;
  band: Band;
  summary: string;
  interviewQuestions: [string, string, string];
}

export interface CandidateWithScore {
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
}
