"use client";

import { useState, useTransition } from "react";
import type { CandidateView, EmailView } from "@/lib/dashboard-data";
import { decideAction, sendCandidateEmailAction, updateEmailDraftAction } from "@/app/actions";
import { AREA_LABELS } from "@/lib/rubric";
import { AREA_KEYS, type DecisionType } from "@/lib/types";

const BAND_COLOR: Record<string, string> = {
  Shortlist: "bg-good/15 text-good",
  "Second look": "bg-warn/15 text-warn",
  Pass: "bg-line text-ink-faint",
};

export default function CandidateCard({ candidate }: { candidate: CandidateView }) {
  const [note, setNote] = useState(candidate.note ?? "");
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  const score = candidate.score;

  function decide(decision: DecisionType) {
    startTransition(async () => {
      await decideAction(candidate.id, decision, note || null);
    });
  }

  const latestEmail = candidate.emails[0];

  return (
    <div className="rounded-sm border border-line bg-surface p-5">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="font-display font-bold uppercase text-2xl leading-none tracking-wide">
            {candidate.name}
          </div>
          <a
            href={`/api/files/${encodeURIComponent(candidate.sourceFile)}`}
            target="_blank"
            className="font-mono text-xs text-ink-faint underline mt-1 inline-block"
          >
            {candidate.sourceFile}
          </a>
        </div>
        {score && (
          <div className="text-right shrink-0">
            <span
              className={`inline-block rounded-sm px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${BAND_COLOR[score.band]}`}
            >
              {score.band}
            </span>
            <div className="font-display font-extrabold text-4xl leading-tight mt-1 text-accent">
              {score.total}
              <span className="font-mono font-normal text-sm text-ink-faint tracking-normal"> /100</span>
            </div>
            {!score.gatePassed && (
              <div className="text-xs text-warn mt-0.5">Gated: hands-on ops experience too low</div>
            )}
          </div>
        )}
      </div>

      {score && (
        <p className="text-sm text-ink-soft mt-3 pb-4 border-b-2 border-accent leading-relaxed">
          {score.summary}
        </p>
      )}

      {score && (
        <button
          className="text-xs text-ink-faint underline mt-3 hover:text-accent transition-colors"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Hide details" : "Show evidence & interview questions"}
        </button>
      )}

      {score && expanded && (
        <div className="mt-4 space-y-3">
          {AREA_KEYS.map((key) => {
            const area = score.areas[key];
            if (!area) return null;
            return (
              <div key={key}>
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <span>{AREA_LABELS[key]}</span>
                  <span className="font-mono font-normal normal-case tracking-normal">
                    {area.score}/5
                  </span>
                </div>
                <div className="h-1.5 bg-line rounded-sm mt-1.5">
                  <div
                    className="h-1.5 bg-accent rounded-sm"
                    style={{ width: `${(area.score / 5) * 100}%` }}
                  />
                </div>
                {area.evidence && (
                  <div className="text-xs text-ink-faint italic mt-1">“{area.evidence}”</div>
                )}
              </div>
            );
          })}

          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft mb-1.5">
              Interview questions
            </div>
            <ul className="list-disc pl-5 text-sm text-ink-soft space-y-0.5">
              {score.interviewQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-line pt-4">
        {candidate.currentDecision ? (
          <div className="text-sm text-ink-soft">
            Decision: <span className="font-semibold text-ink">{candidate.currentDecision}</span>
            {candidate.note && <span> — “{candidate.note}”</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional one-line note"
              className="flex-1 bg-bg border border-line rounded-sm px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
            <button
              disabled={pending}
              onClick={() => decide("ADVANCE")}
              className="rounded-sm bg-accent text-bg font-semibold px-3 py-1.5 text-sm hover:bg-accent-strong transition-colors disabled:opacity-40"
            >
              Advance
            </button>
            <button
              disabled={pending}
              onClick={() => decide("HOLD")}
              className="rounded-sm border border-line text-ink font-semibold px-3 py-1.5 text-sm hover:border-accent transition-colors disabled:opacity-40"
            >
              Hold
            </button>
            <button
              disabled={pending}
              onClick={() => decide("PASS")}
              className="rounded-sm border border-line text-ink-faint px-3 py-1.5 text-sm hover:text-ink-soft transition-colors disabled:opacity-40"
            >
              Pass
            </button>
          </div>
        )}

        {latestEmail && <EmailDraft key={latestEmail.id} email={latestEmail} />}
      </div>
    </div>
  );
}

function EmailDraft({ email }: { email: EmailView }) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [sending, setSending] = useState(false);

  const isSent = email.status === "SENT";
  const edited = subject !== email.subject || body !== email.body;

  async function handleSend() {
    setSending(true);
    try {
      if (edited) {
        await updateEmailDraftAction(email.id, subject, body);
      }
      await sendCandidateEmailAction(email.id, edited);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 rounded-sm bg-bg border border-line p-3.5">
      <div className="flex justify-between items-center">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Draft email — {email.type}
          {isSent && (
            <span className="text-good normal-case font-normal">
              {" "}
              · sent {new Date(email.sentAt!).toLocaleString("en-US")}
            </span>
          )}
        </div>
        {!isSent && (
          <button
            disabled={sending}
            onClick={handleSend}
            className="rounded-sm bg-accent text-bg font-semibold px-3 py-1 text-xs hover:bg-accent-strong transition-colors disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        )}
      </div>

      {isSent ? (
        <>
          <div className="text-sm font-semibold mt-2 text-ink">{email.subject}</div>
          <pre className="text-xs whitespace-pre-wrap text-ink-soft mt-1 font-sans">{email.body}</pre>
        </>
      ) : (
        <div className="mt-2 space-y-1.5">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={sending}
            className="w-full bg-surface border border-line rounded-sm px-2.5 py-1.5 text-sm font-semibold text-ink disabled:opacity-60 focus:border-accent focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={sending}
            rows={7}
            className="w-full bg-surface border border-line rounded-sm px-2.5 py-1.5 text-xs font-sans text-ink-soft disabled:opacity-60 focus:border-accent focus:outline-none"
          />
          {edited && (
            <div className="text-xs text-warn">
              Edited from the AI draft — your version will be saved and sent.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
