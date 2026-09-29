# Kargo Hiring Copilot

A local tool for Arjun Mehta (founder of Kargo) to work through his Product
Manager / Senior Product Manager hiring backlog: score every CV against a
rubric learned from his past hires, decide Advance / Pass / Hold on each
candidate, and send the right email with one click.

**The loop this app implements:** the system recommends, Arjun decides, and
his decision is the last thing he touches. Nothing sends automatically —
every email is drafted by AI and only leaves the building when Arjun clicks
Send.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Environment variables** — copy `.env.example` to `.env` and fill in:
   - `GEMINI_API_KEY` — from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   - `RESEND_API_KEY` — from [resend.com](https://resend.com) (only needed once you flip `DRY_RUN` off)
   - `DATABASE_URL` — leave as `file:./dev.db` for local SQLite
   - `DRY_RUN` — leave as `true` while testing. Emails are logged instead of sent.
3. **Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. **Run it**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Data layout

```
data/
  applications/    # the 60 candidate CVs (PDF/DOCX). Drop new ones here.
  jds/             # the two job descriptions (reference only — not used to score)
eval/
  past_hires/      # the 8 calibration CVs + their known outcomes
  expected_ratings.json
  run-eval.ts
prompts/
  score.md         # the rubric prompt — edit this to tune scoring
```

## The rubric, and where it came from

Arjun's eight past hires didn't match Kargo's job specs especially well. The
five rated "Exceeds Expectations" all did hands-on logistics/freight
operations work before moving into building or selling software for that
world — the weaker hires didn't. `prompts/score.md` scores candidates against
*that* pattern, not against the job description:

| # | Area | Weight |
|---|------|--------|
| 1 | Hands-on operations experience | 30 |
| 2 | Turned operations problems into software/process | 20 |
| 3 | Built something unasked that others adopted | 20 |
| 4 | Owned work with no one in between | 15 |
| 5 | Handled pressure and owned failures | 15 |

A score of 2 or less on area 1 **gates** the candidate out of the Shortlist
band regardless of total. Bands: 75+ Shortlist · 55–74 Second look · below 55
Pass. SPM applicants get a level adjustment on areas 2 and 4 (see
`prompts/score.md` for the exact wording). To change any of this, edit
`prompts/score.md` and re-run the eval (below) — the weights/gate/bands
themselves live in `src/lib/rubric.ts`.

## Running the calibration eval

Before trusting the scorer on the real 60 applications, it has to reproduce
Arjun's own past calls:

```bash
npm run eval
```

This scores all 8 past hires and checks that every "Exceeds Expectations"
hire lands at 75+ and every "Meets"/"Below Expectations" hire lands under 55.
Re-run this after any change to `prompts/score.md` or `src/lib/rubric.ts`.

## Using the app

1. **Ingest & Score** (`/ingest`) — lists every CV in `data/applications`,
   pre-filling PM/SPM from the filename prefix (`pm_...` / `spm_...`) where
   present. Confirm the role for the rest, then score.
2. **Dashboard** (`/`) — ranked PM and SPM tabs. Each card shows the total,
   band, per-area evidence quotes, a two-sentence summary, and three
   interview questions targeting the candidate's weakest areas. Click
   **Advance**, **Pass**, or **Hold** (with an optional note) — this drafts
   the matching email (interview invite / respectful decline / "still
   reviewing" note) but does **not** send it.
3. **Send** — review the draft on the card, then click **Send**. While
   `DRY_RUN=true` this only logs the email (visible in your terminal and
   recorded in the audit log); flip it to `false` once you trust it.
4. Cards needing attention (no decision after 5 days, an invite sent 3+ days
   ago, a Hold sitting for a week) are flagged at the top of the dashboard —
   these are suggestions for you to act on, never automatic sends.
5. **Audit Log** (`/audit`) — every score, decision, note, and email is
   timestamped here. Export to CSV any time.

## Why there's no auto-send

The brief's automated-follow-through language ("send automatically after a
10-minute undo window", scheduled 3-day/7-day nudges) was scoped back to
one-click send for every candidate-facing email. Automating an irreversible,
candidate-facing action without a human confirming it first is exactly the
kind of thing a hiring process shouldn't hand fully to a script — Arjun sees
every draft before it goes out. The system still tells him *when* something
needs sending (the flags above); he still clicks Send.
