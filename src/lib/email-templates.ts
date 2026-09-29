import { GoogleGenAI } from "@google/genai";
import type { CandidateRole, DecisionType } from "./types";

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

const DRAFT_JSON_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: {
      type: "string",
      description:
        "Plain-text email body. No markdown. Sign off as 'Arjun Mehta, Founder, Kargo'.",
    },
  },
  required: ["subject", "body"],
  additionalProperties: false,
};

export interface EmailDraftInput {
  candidateName: string;
  role: CandidateRole;
  decision: DecisionType;
  candidateSummary: string;
  note?: string | null;
  schedulingLink?: string;
}

const ROLE_LABEL: Record<CandidateRole, string> = {
  PM: "Product Manager",
  SPM: "Senior Product Manager",
};

function systemInstructionFor(decision: DecisionType): string {
  const shared =
    "You are drafting a candidate email on behalf of Arjun Mehta, founder of Kargo, a Series A logistics SaaS company in Mumbai. Write in Arjun's voice: direct, warm, specific, no corporate filler. Never mention scores, rubrics, ratings, bands, or any internal evaluation mechanics. Never use the phrase 'unfortunately' more than once. Respond only with the requested JSON.";

  if (decision === "ADVANCE") {
    return `${shared}\n\nThis is an INTERVIEW INVITE. Reference one specific, genuine thing from the candidate's background that stood out (from the summary provided). Include the scheduling link plainly. Keep it under 150 words.`;
  }
  if (decision === "PASS") {
    return `${shared}\n\nThis is a DECLINE. Be respectful and specific — reference something real and positive about their background (from the summary provided) so it does not read as a form rejection — but do not give detailed feedback on why they weren't selected, and never mention scoring. Keep it under 120 words. Wish them well genuinely.`;
  }
  return `${shared}\n\nThis is a HOLDING note — the candidate has been marked for further review and has not heard back in a while. Let them know Arjun is still reviewing applications for the role and will follow up soon. Keep it short, warm, and honest — under 80 words. Do not overpromise a timeline.`;
}

export async function generateEmailDraft(
  input: EmailDraftInput,
): Promise<{ subject: string; body: string }> {
  const ai = getClient();

  const userContent = [
    `Candidate: ${input.candidateName}`,
    `Role applied for: ${ROLE_LABEL[input.role]}`,
    `Candidate summary: ${input.candidateSummary}`,
    input.note ? `Arjun's note: ${input.note}` : null,
    input.decision === "ADVANCE"
      ? `Scheduling link to include: ${input.schedulingLink}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    config: {
      systemInstruction: systemInstructionFor(input.decision),
      responseMimeType: "application/json",
      responseJsonSchema: DRAFT_JSON_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Model returned no text for email draft");
  return JSON.parse(text) as { subject: string; body: string };
}
