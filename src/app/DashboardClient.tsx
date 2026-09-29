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
        <div className="mb-6 rounded border border-amber-300 bg-amber-50 p-3">
          <div className="font-medium text-amber-900 text-sm mb-1">Needs attention</div>
          <ul className="text-sm text-amber-800 list-disc pl-5">
            {flagged.map((c) => (
              <li key={c.id}>
                {c.name} ({c.role}) — {c.flags.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 mb-4 border-b border-neutral-200">
        {(["PM", "SPM"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setTab(r)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${
              tab === r ? "border-neutral-900 font-medium" : "border-transparent text-neutral-500"
            }`}
          >
            {r === "PM" ? "Product Manager" : "Senior Product Manager"} (
            {candidates.filter((c) => c.role === r).length})
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="text-sm text-neutral-500">
          No candidates scored for this role yet. Go to{" "}
          <a href="/ingest" className="underline">
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
