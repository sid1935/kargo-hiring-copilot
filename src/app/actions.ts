"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { extractCvText } from "@/lib/extract-text";
import { scoreCandidate } from "@/lib/gemini-score";
import { generateEmailDraft } from "@/lib/email-templates";
import { sendEmail, isDryRun } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { APPLICATIONS_DIR, guessEmail, guessName, normalizeName } from "@/lib/candidates";
import type { CandidateRole, DecisionType } from "@/lib/types";

export async function ingestAndScoreAction(fileName: string, role: CandidateRole) {
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

  revalidatePath("/");
  revalidatePath("/ingest");
  return { candidateId: candidate.id, total: result.total, band: result.band };
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

export async function sendCandidateEmailAction(emailId: string) {
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
    to,
    dryRun: result.dryRun,
    providerId: result.providerId,
  });

  revalidatePath("/");
  return result;
}
