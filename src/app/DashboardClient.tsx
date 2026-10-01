"use client";

import { useMemo, useState } from "react";
import type { CandidateView } from "@/lib/dashboard-data";
import CandidateCard from "./CandidateCard";

export default function DashboardClient({ candidates }: { candidates: CandidateView[] }) {
  const [tab, setTab] = useState<"PM" | "SPM">("PM");

  const flagged = candidates.filter((c) => c.flags.length > 0);

  const shown = useMemo(() => {
    return candidates
      .filter((c) => c.role === tab)
      .sort((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1));
  }, [candidates, tab]);

  return (
    <div>
      {flagged.length > 0 && (
        <div className="mb-6 rounded border border-warn/30 bg-warn/10 p-3">
          <div className="font-semibold text-warn text-xs uppercase tracking-wide mb-1">
            Needs attention
          </div>
          <ul className="text-sm text-ink-soft list-disc pl-5">
            {flagged.map((c) => (
              <li key={c.id}>
                {c.name} ({c.role}) — {c.flags.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 mb-4 border-b border-line">
        {(["PM", "SPM"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setTab(r)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === r
                ? "border-accent font-semibold text-ink"
                : "border-transparent text-ink-faint hover:text-ink-soft"
            }`}
          >
            {r === "PM" ? "Product Manager" : "Senior Product Manager"} (
            {candidates.filter((c) => c.role === r).length})
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="text-sm text-ink-soft">
          No candidates scored for this role yet. Go to{" "}
          <a href="/ingest" className="text-accent underline">
            Ingest &amp; Score
          </a>{" "}
          to get started.
        </p>
      )}

      <div className="space-y-4">
        {shown.map((c) => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}
