import { AREA_KEYS, type AreaKey, type Areas, type Band } from "./types";

// Weights must sum to 100 — see prompts/score.md for the full rubric text.
export const AREA_WEIGHTS: Record<AreaKey, number> = {
  operations_experience: 30,
  operations_to_software: 20,
  built_unasked_adopted: 20,
  ownership: 15,
  pressure_and_failures: 15,
};

export const AREA_LABELS: Record<AreaKey, string> = {
  operations_experience: "Hands-on operations experience",
  operations_to_software: "Turned ops problems into software/process",
  built_unasked_adopted: "Built something unasked that others adopted",
  ownership: "Owned work with no one in between",
  pressure_and_failures: "Handled pressure and owned failures",
};

export const GATE_AREA: AreaKey = "operations_experience";
export const GATE_MAX_SCORE_TO_BLOCK = 2; // area score <= this blocks the shortlist

export function computeTotal(areas: Areas): number {
  let total = 0;
  for (const key of AREA_KEYS) {
    const s = areas[key]?.score ?? 0;
    total += (AREA_WEIGHTS[key] * s) / 5;
  }
  return Math.round(total);
}

export function computeGatePassed(areas: Areas): boolean {
  const gateScore = areas[GATE_AREA]?.score ?? 0;
  return gateScore > GATE_MAX_SCORE_TO_BLOCK;
}

export function computeBand(total: number, gatePassed: boolean): Band {
  if (!gatePassed) return "Pass";
  if (total >= 75) return "Shortlist";
  if (total >= 55) return "Second look";
  return "Pass";
}
