"use server";

import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { extractCvText } from "@/lib/extract-text";
import { scoreCandidate } from "@/lib/gemini-score";
import { generateEmailDraft } from "@/lib/email-templates";
import { sendEmail, isDryRun } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { APPLICATIONS_DIR, guessEmail, guessName, normalizeName } from "@/lib/candidates";
import { mapWithConcurrency } from "@/lib/concurrency";
import type { CandidateRole, DecisionType } from "@/lib/types";

export interface UploadCvResult {
  added: string[];
  skipped: { fileName: string; reason: string }[];
}

/**
 * Saves uploaded CV files into data/applications so they show up in the
 * ingest list. Only works where the filesystem is actually writable — on
 * Vercel's deployed bundle it is not (read-only), so this only works when
 * running locally.
 */
export async function uploadCvAction(formData: FormData): Promise<UploadCvResult> {
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  const added: string[] = [];
  const skipped: UploadCvResult["skipped"] = [];

  for (const file of files) {
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      skipped.push({ fileName: file.name, reason: "Only .pdf and .docx are supported" });
      continue;
    }

    const safeName = path.basename(file.name); // guard against path traversal
    const dest = path.join(APPLICATIONS_DIR, safeName);

    if (existsSync(dest)) {
      skipped.push({ fileName: file.name, reason: "A file with this name already exists" });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(dest, buffer);
    added.push(safeName);
  }

  revalidatePath("/ingest");
  return { added, skipped };
}

async function scoreOneCandidate(fileName: string, role: CandidateRole) {
  const filePath = path.join(APPLICATIONS_DIR, fileName);
  const cvText = await extractCvText(filePath);
  const email = guessEmail(cvText);

  const result = await scoreCandidate(cvText, role);
  const name = normalizeName(result.candidateName?.trim() || guessName(cvText, fileName));

  const candidate = await prisma.candidate.create({
    data: {
      name,
      email,
      role,
      sourceFile: fileName,
      cvText,
      score: {
        create: {
          areas: JSON.stringify(result.areas),
          gatePassed: result.gatePassed,
          total: result.total,
          band: result.band,
          summary: result.summary,
          interviewQuestions: JSON.stringify(result.interviewQuestions),
          rawResponse: JSON.stringify(result.rawResponse),
          model: result.model,
        },
      },
    },
  });

  await logAudit(candidate.id, "SCORED", {
    total: result.total,
    band: result.band,
    gatePassed: result.gatePassed,
  });

  return { candidateId: candidate.id, total: result.total, band: result.band };
}

export async function ingestAndScoreAction(fileName: string, role: CandidateRole) {
  const result = await scoreOneCandidate(fileName, role);
  revalidatePath("/");
  revalidatePath("/ingest");
  return result;
}

export interface BatchScoreItem {
  fileName: string;
  role: CandidateRole;
}

export interface BatchScoreResult {
  fileName: string;
  ok: boolean;
  total?: number;
  band?: string;
  error?: string;
}

const SCORE_CONCURRENCY = 8;

/**
 * Scores several CVs concurrently (bounded by SCORE_CONCURRENCY) inside one
 * Server Action call. Next.js dispatches Server Actions one at a time per
 * client, so calling many single-file actions from the browser — even via
 * Promise.all — would still run them sequentially; the concurrency has to
 * live inside a single action to actually happen.
 */
export async function ingestAndScoreBatchAction(
  items: BatchScoreItem[],
): Promise<BatchScoreResult[]> {
  const results = await mapWithConcurrency(items, SCORE_CONCURRENCY, async (item) => {
    try {
      const r = await scoreOneCandidate(item.fileName, item.role);
      return { fileName: item.fileName, ok: true, total: r.total, band: r.band } satisfies BatchScoreResult;
    } catch (err) {
      return {
        fileName: item.fileName,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      } satisfies BatchScoreResult;
    }
  });

  revalidatePath("/");
  revalidatePath("/ingest");
  return results;
}

export async function decideAction(
  candidateId: string,
  decision: DecisionType,
  note: string | null,
) {
  const candidate = await prisma.candidate.findUniqueOrThrow({
    where: { id: candidateId },
    include: { score: true },
  });

  await prisma.decisionEvent.create({
    data: { candidateId, decision, note },
  });
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { currentDecision: decision, decidedAt: new Date(), note },
  });
  await logAudit(candidateId, "DECIDED", { decision, note });

  const emailType = decision === "ADVANCE" ? "INVITE" : decision === "PASS" ? "DECLINE" : "HOLDING";

  const draft = await generateEmailDraft({
    candidateName: candidate.name,
    role: candidate.role as CandidateRole,
    decision,
    candidateSummary: candidate.score?.summary ?? "",
    note,
    schedulingLink: process.env.SCHEDULING_LINK,
  });

  const email = await prisma.email.create({
    data: {
      candidateId,
      type: emailType,
      subject: draft.subject,
      body: draft.body,
      status: "DRAFT",
      dryRun: isDryRun(),
    },
  });

  await logAudit(candidateId, "EMAIL_DRAFTED", { emailId: email.id, type: emailType });

  revalidatePath("/");
  return { emailId: email.id };
}

export async function updateEmailDraftAction(emailId: string, subject: string, body: string) {
  const email = await prisma.email.findUniqueOrThrow({ where: { id: emailId } });
  if (email.status !== "DRAFT") throw new Error("Cannot edit an email that has already been sent");

  await prisma.email.update({ where: { id: emailId }, data: { subject, body } });
  revalidatePath("/");
}

export async function sendCandidateEmailAction(emailId: string, edited: boolean) {
  const email = await prisma.email.findUniqueOrThrow({
    where: { id: emailId },
    include: { candidate: true },
  });

  const to = email.candidate.email ?? "no-email-on-file@example.com";
  const result = await sendEmail({ to, subject: email.subject, body: email.body });

  await prisma.email.update({
    where: { id: emailId },
    data: { status: "SENT", sentAt: new Date() },
  });

  await logAudit(email.candidateId, "EMAIL_SENT", {
    emailId,
    candidateEmail: to,
    actualTo: result.actualTo,
    dryRun: result.dryRun,
    providerId: result.providerId,
    editedByArjun: edited,
  });

  revalidatePath("/");
  return result;
}
