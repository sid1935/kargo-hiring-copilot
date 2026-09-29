import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import {
  AREA_KEYS,
  type AreaKey,
  type Areas,
  type CandidateRole,
  type ScoreResult,
} from "./types";
import { computeBand, computeGatePassed, computeTotal } from "./rubric";

const RUBRIC_PROMPT = fs.readFileSync(
  path.join(process.cwd(), "prompts", "score.md"),
  "utf-8",
);

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const areaSchema = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 1, maximum: 5 },
    evidence: {
      type: "string",
      description:
        "A single line quoted verbatim from the CV text as evidence for this score. Empty string only if genuinely nothing in the CV speaks to this area.",
    },
  },
  required: ["score", "evidence"],
  additionalProperties: false,
};

const SCORE_JSON_SCHEMA = {
  type: "object",
  properties: {
    candidate_name: {
      type: "string",
      description:
        "The candidate's full name, exactly as it appears in the CV. Search the WHOLE document for it — some CV templates place the name/contact header after the body text or on a later page, not on the first line, so do not assume it's near the top.",
    },
    areas: {
      type: "object",
      properties: Object.fromEntries(AREA_KEYS.map((k) => [k, areaSchema])),
      required: [...AREA_KEYS],
      additionalProperties: false,
    },
    summary: {
      type: "string",
      description: "Exactly two sentences describing who this candidate is.",
    },
    interview_questions: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ["candidate_name", "areas", "summary", "interview_questions"],
  additionalProperties: false,
};

interface RawScoreResult {
  candidate_name: string;
  areas: Record<string, { score: number; evidence: string }>;
  summary: string;
  interview_questions: string[];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Every non-empty evidence quote must actually appear in the source CV text. */
function findMissingEvidence(raw: RawScoreResult, cvText: string): AreaKey[] {
  const haystack = normalize(cvText);
  const missing: AreaKey[] = [];
  for (const key of AREA_KEYS) {
    const evidence = raw.areas[key]?.evidence ?? "";
    if (!evidence.trim()) continue; // allowed to be empty, but then score should be low
    if (!haystack.includes(normalize(evidence))) missing.push(key);
  }
  return missing;
}

export async function scoreCandidate(
  cvText: string,
  role: CandidateRole,
  opts: { maxRetries?: number } = {},
): Promise<ScoreResult & { rawResponse: unknown; model: string; candidateName: string }> {
  const maxRetries = opts.maxRetries ?? 2;
  const ai = getClient();

  const roleNote =
    role === "SPM"
      ? "This candidate applied for the Senior Product Manager (SPM) role — apply the SPM level adjustment described in the rubric for areas 2 and 4."
      : "This candidate applied for the Product Manager (PM) role — use the base rubric anchors, no level adjustment.";

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [
    {
      role: "user",
      parts: [{ text: `${roleNote}\n\nCV TEXT:\n"""\n${cvText}\n"""` }],
    },
  ];

  let lastRaw: RawScoreResult | null = null;
  let lastFullResponse: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents,
      config: {
        systemInstruction: RUBRIC_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: SCORE_JSON_SCHEMA,
      },
    });
    lastFullResponse = response;

    const text = response.text;
    if (!text) throw new Error("Model returned no text for scoring");

    let raw: RawScoreResult;
    try {
      raw = JSON.parse(text) as RawScoreResult;
    } catch {
      throw new Error(`Model returned invalid JSON: ${text.slice(0, 200)}`);
    }
    lastRaw = raw;

    const missing = findMissingEvidence(raw, cvText);
    if (missing.length === 0) break;

    if (attempt === maxRetries) {
      throw new Error(
        `Score rejected after ${maxRetries + 1} attempts: evidence for [${missing.join(", ")}] was not found verbatim in the CV text`,
      );
    }

    contents.push({ role: "model", parts: [{ text }] });
    contents.push({
      role: "user",
      parts: [
        {
          text: `The evidence quotes for these areas do not appear verbatim in the CV text: ${missing.join(", ")}. Re-read the CV and resubmit the full JSON again with a real quote for each of those areas (or a genuinely lower score with empty evidence if nothing supports it).`,
        },
      ],
    });
  }

  if (!lastRaw) throw new Error("Scoring failed: no result produced");

  const areas: Areas = lastRaw.areas as Areas;
  const gatePassed = computeGatePassed(areas);
  const total = computeTotal(areas);
  const band = computeBand(total, gatePassed);

  const [q1, q2, q3] = lastRaw.interview_questions;

  return {
    candidateName: lastRaw.candidate_name,
    areas,
    gatePassed,
    total,
    band,
    summary: lastRaw.summary,
    interviewQuestions: [q1, q2, q3],
    rawResponse: lastFullResponse,
    model: DEFAULT_MODEL,
  };
}
