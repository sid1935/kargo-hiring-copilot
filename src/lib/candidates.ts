import fs from "node:fs";
import path from "node:path";
import { prisma } from "./db";
import { inferRoleFromFilename, guessNameFromFilename } from "./extract-text";
import type { CandidateRole } from "./types";

export const APPLICATIONS_DIR = path.join(process.cwd(), "data", "applications");

export interface ApplicationFile {
  fileName: string;
  inferredRole: CandidateRole | null;
  alreadyIngested: boolean;
}

export async function listApplicationFiles(): Promise<ApplicationFile[]> {
  const entries = fs
    .readdirSync(APPLICATIONS_DIR)
    .filter((f) => /\.(pdf|docx)$/i.test(f))
    .sort();

  const ingested = await prisma.candidate.findMany({
    select: { sourceFile: true },
  });
  const ingestedSet = new Set(ingested.map((c) => c.sourceFile));

  return entries.map((fileName) => ({
    fileName,
    inferredRole: inferRoleFromFilename(fileName),
    alreadyIngested: ingestedSet.has(fileName),
  }));
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

/** Best-effort name extraction: prefer a clean first non-empty line of the CV
 * text (most resumes lead with the candidate's name); fall back to the
 * filename. */
export function guessName(cvText: string, fileName: string): string {
  const firstLine = cvText
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && l.length < 60 && !EMAIL_REGEX.test(l));
  if (firstLine && /^[A-Za-z][A-Za-z.'-]*(\s+[A-Za-z][A-Za-z.'-]*){0,3}$/.test(firstLine)) {
    return firstLine;
  }
  return guessNameFromFilename(fileName);
}

export function guessEmail(cvText: string): string | null {
  const match = cvText.match(EMAIL_REGEX);
  return match ? match[0] : null;
}

/** Some CV templates render the header name in all caps (e.g. "SNEHA
 * KULKARNI"). Title-case it for display; leave mixed-case names untouched
 * since they may be intentional (e.g. "McKinsey"). */
export function normalizeName(name: string): string {
  if (name !== name.toUpperCase() || name === name.toLowerCase()) return name;
  return name
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
