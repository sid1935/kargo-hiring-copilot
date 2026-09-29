"use client";

import { useState, useTransition } from "react";
import type { CandidateView, EmailView } from "@/lib/dashboard-data";
import { decideAction, sendCandidateEmailAction, updateEmailDraftAction } from "@/app/actions";
import { AREA_LABELS } from "@/lib/rubric";
import { AREA_KEYS, type DecisionType } from "@/lib/types";

const BAND_COLOR: Record<string, string> = {
  Shortlist: "bg-green-100 text-green-800",
  "Second look": "bg-amber-100 text-amber-800",
  Pass: "bg-neutral-100 text-neutral-600",
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
    <div className="rounded border border-neutral-200 p-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">{candidate.name}</div>
          <a
            href={`/api/files/${encodeURIComponent(candidate.sourceFile)}`}
            target="_blank"
            className="text-xs text-neutral-400 underline"
          >
            {candidate.sourceFile}
          </a>
        </div>
        {score && (
          <div className="text-right">
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${BAND_COLOR[score.band]}`}>
              {score.band}
            </span>
            <div className="text-lg font-semibold">{score.total}/100</div>
            {!score.gatePassed && (
              <div className="text-xs text-red-600">Gated: hands-on ops experience too low</div>
            )}
          </div>
        )}
      </div>

      {score && <p className="text-sm text-neutral-700 mt-2">{score.summary}</p>}

      {score && (
        <button
          className="text-xs text-neutral-500 underline mt-2"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Hide details" : "Show evidence & interview questions"}
        </button>
      )}

      {score && expanded && (
        <div className="mt-3 space-y-2">
          {AREA_KEYS.map((key) => {
            const area = score.areas[key];
            if (!area) return null;
            return (
              <div key={key}>
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>{AREA_LABELS[key]}</span>
                  <span>{area.score}/5</span>
                </div>
                <div className="h-1.5 bg-neutral-100 rounded">
                  <div
                    className="h-1.5 bg-neutral-800 rounded"
                    style={{ width: `${(area.score / 5) * 100}%` }}
                  />
                </div>
                {area.evidence && (
                  <div className="text-xs text-neutral-500 italic mt-0.5">“{area.evidence}”</div>
                )}
              </div>
            );
          })}

          <div className="mt-3">
            <div className="text-xs font-medium text-neutral-600 mb-1">Interview questions</div>
            <ul className="list-disc pl-5 text-sm text-neutral-700">
              {score.interviewQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-neutral-100 pt-3">
        {candidate.currentDecision ? (
          <div className="text-sm">
            Decision: <span className="font-medium">{candidate.currentDecision}</span>
            {candidate.note && <span className="text-neutral-500"> — “{candidate.note}”</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional one-line note"
              className="flex-1 border rounded px-2 py-1 text-sm"
            />
            <button
              disabled={pending}
              onClick={() => decide("ADVANCE")}
              className="rounded bg-green-700 text-white px-3 py-1 text-sm disabled:opacity-40"
            >
              Advance
            </button>
            <button
              disabled={pending}
              onClick={() => decide("HOLD")}
              className="rounded bg-amber-600 text-white px-3 py-1 text-sm disabled:opacity-40"
            >
              Hold
            </button>
            <button
              disabled={pending}
              onClick={() => decide("PASS")}
              className="rounded bg-neutral-500 text-white px-3 py-1 text-sm disabled:opacity-40"
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
    <div className="mt-3 rounded bg-neutral-50 p-3">
      <div className="flex justify-between items-center">
        <div className="text-xs font-medium text-neutral-600">
          Draft email — {email.type}
          {isSent && (
            <span className="text-green-700"> · sent {new Date(email.sentAt!).toLocaleString()}</span>
          )}
        </div>
        {!isSent && (
          <button
            disabled={sending}
            onClick={handleSend}
            className="rounded bg-neutral-900 text-white px-3 py-1 text-xs disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        )}
      </div>

      {isSent ? (
        <>
          <div className="text-sm font-medium mt-1">{email.subject}</div>
          <pre className="text-xs whitespace-pre-wrap text-neutral-700 mt-1 font-sans">{email.body}</pre>
        </>
      ) : (
        <div className="mt-1 space-y-1">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={sending}
            className="w-full border rounded px-2 py-1 text-sm font-medium disabled:opacity-60"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={sending}
            rows={7}
            className="w-full border rounded px-2 py-1 text-xs font-sans disabled:opacity-60"
          />
          {edited && (
            <div className="text-xs text-amber-600">
              Edited from the AI draft — your version will be saved and sent.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
