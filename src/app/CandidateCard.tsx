"use client";

import { useState, useTransition } from "react";
import type { CandidateView } from "@/lib/dashboard-data";
import { decideAction, sendCandidateEmailAction } from "@/app/actions";
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
  const [sendingId, setSendingId] = useState<string | null>(null);

  const score = candidate.score;

  function decide(decision: DecisionType) {
    startTransition(async () => {
      await decideAction(candidate.id, decision, note || null);
    });
  }

  async function send(emailId: string) {
    setSendingId(emailId);
    try {
      await sendCandidateEmailAction(emailId);
    } finally {
      setSendingId(null);
    }
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

        {latestEmail && (
          <div className="mt-3 rounded bg-neutral-50 p-3">
            <div className="flex justify-between items-center">
              <div className="text-xs font-medium text-neutral-600">
                Draft email — {latestEmail.type}
                {latestEmail.status === "SENT" && (
                  <span className="text-green-700"> · sent {new Date(latestEmail.sentAt!).toLocaleString()}</span>
                )}
              </div>
              {latestEmail.status === "DRAFT" && (
                <button
                  disabled={sendingId === latestEmail.id}
                  onClick={() => send(latestEmail.id)}
                  className="rounded bg-neutral-900 text-white px-3 py-1 text-xs disabled:opacity-40"
                >
                  {sendingId === latestEmail.id ? "Sending…" : "Send"}
                </button>
              )}
            </div>
            <div className="text-sm font-medium mt-1">{latestEmail.subject}</div>
            <pre className="text-xs whitespace-pre-wrap text-neutral-700 mt-1 font-sans">
              {latestEmail.body}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
