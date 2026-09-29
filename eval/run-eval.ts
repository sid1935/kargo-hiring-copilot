import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { scoreCandidate } from "../src/lib/gemini-score";

interface ExpectedCase {
  file: string;
  name: string;
  roleHiredInto: string;
  lastRating: string;
  expectedBand: "Shortlist" | "NotShortlist";
}

interface ExpectedFile {
  cases: ExpectedCase[];
  passCriteria: string;
}

async function main() {
  const evalDir = path.join(process.cwd(), "eval");
  const expected: ExpectedFile = JSON.parse(
    fs.readFileSync(path.join(evalDir, "expected_ratings.json"), "utf-8"),
  );

  const rows: {
    name: string;
    lastRating: string;
    total: number;
    band: string;
    gatePassed: boolean;
    expected: string;
    pass: boolean;
  }[] = [];

  for (const c of expected.cases) {
    const cvText = fs.readFileSync(
      path.join(evalDir, "past_hires", c.file),
      "utf-8",
    );
    // Past hires are scored against the base rubric — none were hired as SPM.
    const result = await scoreCandidate(cvText, "PM");

    const isExceeds = c.lastRating === "Exceeds Expectations";
    const pass = isExceeds ? result.total >= 75 : result.total < 55;

    rows.push({
      name: c.name,
      lastRating: c.lastRating,
      total: result.total,
      band: result.band,
      gatePassed: result.gatePassed,
      expected: isExceeds ? ">= 75" : "< 55",
      pass,
    });
  }

  const nameW = Math.max(...rows.map((r) => r.name.length), 20);
  const header = `${"Name".padEnd(nameW)}  ${"Last Rating".padEnd(20)}  ${"Total".padEnd(6)}${"Band".padEnd(14)}${"Gate".padEnd(6)}${"Needed".padEnd(8)}Result`;
  console.log(header);
  console.log("-".repeat(header.length));
  for (const r of rows) {
    console.log(
      `${r.name.padEnd(nameW)}  ${r.lastRating.padEnd(20)}  ${String(r.total).padEnd(6)}${r.band.padEnd(14)}${(r.gatePassed ? "yes" : "no").padEnd(6)}${r.expected.padEnd(8)}${r.pass ? "PASS" : "FAIL"}`,
    );
  }

  const allPass = rows.every((r) => r.pass);
  console.log("\n" + (allPass ? "✅ All calibration checks passed." : "❌ Calibration failed — see FAIL rows above."));
  if (!allPass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
