import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/db";
import { extractCvText } from "../src/lib/extract-text";
import { scoreCandidate } from "../src/lib/gemini-score";
import { logAudit } from "../src/lib/audit";
import { APPLICATIONS_DIR, guessEmail, guessName, normalizeName } from "../src/lib/candidates";
import { inferRoleFromFilename } from "../src/lib/extract-text";
import type { CandidateRole } from "../src/lib/types";

// Files with no pm_/spm_ filename prefix, triaged by stated seniority/years
// against the JD bands (PM ~2-4 yrs, SPM ~5-8 yrs / senior ownership).
const SPM_OVERRIDES = new Set([
  "02_priya_sharma.pdf",
  "03_arnav_sen.pdf",
  "08_vikram_shetty.pdf",
  "10_nikhil_sharma.pdf",
  "11_tarun_joseph.pdf",
  "13_mohit_singh.pdf",
  "27_abhishek_tiwari.pdf",
  "28_manish_kapoor.pdf",
  "29_rohan_basu.pdf",
]);

function resolveRole(fileName: string): CandidateRole {
  return inferRoleFromFilename(fileName) ?? (SPM_OVERRIDES.has(fileName) ? "SPM" : "PM");
}

async function main() {
  const files = fs
    .readdirSync(APPLICATIONS_DIR)
    .filter((f) => /\.(pdf|docx)$/i.test(f))
    .sort();

  const already = await prisma.candidate.findMany({ select: { sourceFile: true } });
  const alreadySet = new Set(already.map((c) => c.sourceFile));

  const todo = files.filter((f) => !alreadySet.has(f));
  console.log(`${todo.length} of ${files.length} files to score.\n`);

  let ok = 0;
  let failed = 0;

  for (const [i, fileName] of todo.entries()) {
    const role = resolveRole(fileName);
    const start = Date.now();
    try {
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

      ok++;
      const secs = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `[${i + 1}/${todo.length}] ✓ ${fileName} (${role}) — ${name} — ${result.total}/100 ${result.band} (${secs}s)`,
      );
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[${i + 1}/${todo.length}] ✗ ${fileName} (${role}) — ${msg}`);
    }
  }

  console.log(`\nDone. ${ok} scored, ${failed} failed.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
