# Kargo Candidate Scoring Rubric

## Why this rubric exists

Arjun's eight past hires did not match Kargo's job specs especially well. The five rated
"Exceeds Expectations" all did hands-on logistics or freight operations work before moving into
building or selling software for that world. The weaker hires didn't. This rubric scores for that
pattern, not for the job spec. Do not use the job description to score a candidate — score only
against the criteria below.

## Areas (weight → points = weight × score ÷ 5)

1. **Hands-on operations experience** (freight, customs, 3PL, port, supply chain) — weight 30
   - 5: Two or more years doing the operations work itself
   - 3: Worked next to operations teams (rollouts, client-facing implementation work)
   - 1: None, or only through APIs, dashboards, or a desk
   - Judge this by what the person actually did day to day, not their job title.
     A "sales" or "commercial" title at a port, terminal, freight forwarder, or
     3PL still counts toward a 5 if the role required directly handling real
     operational friction — berth allocation, customs holds, container
     detention, documentation errors, service failures, escalations — rather
     than only selling into operations or observing it from a distance.
2. **Turned operations problems into software or processes** — weight 20
   - 5: Personally took a field problem and got it built or fixed
   - 3: Passed field needs to people who built the fix
   - 1: Worked only inside the product or tech side
3. **Built something unasked that others adopted** — weight 20
   - 5: Built a fix without being asked, and other teams adopted it
   - 3: Improvements only inside their own role
   - 1: Nothing self-started
4. **Owned work with no one in between** — weight 15
   - 5: Sole owner, no manager layer, or fully independent
   - 3: Owned an area inside a formal structure
   - 1: One of many in a large team
5. **Handled pressure and owned failures** — weight 15
   - 5: Fixed a live crisis themselves; wrote up or stopped their own failures
   - 3: Fixed problems, with no sign of owning mistakes
   - 1: No evidence

Score every area 1-5 (2 and 4 are valid intermediate scores when the evidence sits between two
anchors). Points for an area = weight × score ÷ 5. Total is the sum of points across all five areas
(max 100).

## Gate

If area 1 (hands-on operations experience) scores 2 or less, the candidate is **gated** —
`gate_passed` is `false` — regardless of the total. A gated candidate cannot land in the
"Shortlist" band no matter what the total says.

## Bands

- 75 and above → **Shortlist**
- 55 to 74 → **Second look**
- Below 55 → **Pass**

A gated candidate (area 1 ≤ 2) is always **Pass**, even if the arithmetic total would be 75+.

## Level adjustment — Senior Product Manager (SPM) candidates only

When the role is SPM:
- Area 4 evidence must show ownership of **larger, long-term decisions** (not just day-to-day
  execution) to earn a 5.
- Area 2 evidence must involve **working with systems and integrations** (not just isolated
  features) to earn a 5.

For PM candidates, or when scoring one of the past-hire calibration profiles, use the base anchors
above without this adjustment.

## Never score or mention

School or MBA pedigree, PM certifications, years held with a "PM" title, tool/technology lists,
conference talks given, or personal attributes (age, gender, location, names of institutions).
If the CV leans on these, they are simply not evidence for any area — do not penalize or reward
their presence.

## Evidence requirement

Every area score must be backed by a **direct quote from the CV text**, copied verbatim (trimmed to
one line). A score with no quoted evidence, or a quote that does not actually appear in the CV
text, is invalid — you will be asked to redo it.

## Output

Return only the structured JSON described by the provided schema:
- `candidate_name`: the candidate's full name, exactly as written in the CV. Some CV templates
  place the name/contact header after the body text or on a later page — search the whole
  document rather than assuming it's on the first line.
- `areas`: one entry per area, each with `score` (1-5) and `evidence` (verbatim one-line quote,
  or empty string only if truly nothing in the CV speaks to that area, which should be rare and
  itself signals a low score)
- `gate_passed`: boolean, per the Gate section above
- `total`: integer 0-100, computed exactly as described
- `band`: one of "Shortlist", "Second look", "Pass"
- `summary`: exactly two sentences — who this candidate is, in plain language, based only on their
  operational and ownership pattern (not their job titles)
- `interview_questions`: exactly three questions, each targeting one of the candidate's two or
  three weakest-scoring areas, specific enough to probe the actual gaps in their evidence
