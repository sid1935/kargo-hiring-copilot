"use client";

import { useState } from "react";
import { ingestAndScoreAction } from "@/app/actions";
import type { ApplicationFile } from "@/lib/candidates";
import type { CandidateRole } from "@/lib/types";

interface RowState extends ApplicationFile {
  role: CandidateRole;
  selected: boolean;
  status: "idle" | "scoring" | "done" | "error";
  error?: string;
}

export default function IngestClient({
  initialFiles,
}: {
  initialFiles: ApplicationFile[];
}) {
  const [rows, setRows] = useState<RowState[]>(
    initialFiles.map((f) => ({
      ...f,
      role: f.inferredRole ?? "PM",
      selected: !f.alreadyIngested,
      status: f.alreadyIngested ? "done" : "idle",
    })),
  );
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  function setRow(fileName: string, patch: Partial<RowState>) {
    setRows((rs) => rs.map((r) => (r.fileName === fileName ? { ...r, ...patch } : r)));
  }

  async function scoreOne(row: RowState) {
    setRow(row.fileName, { status: "scoring", error: undefined });
    try {
      await ingestAndScoreAction(row.fileName, row.role);
      setRow(row.fileName, { status: "done" });
    } catch (err) {
      setRow(row.fileName, {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function scoreSelected() {
    const targets = rows.filter((r) => r.selected && r.status !== "done");
    setRunning(true);
    setProgress({ done: 0, total: targets.length });
    for (const row of targets) {
      await scoreOne(row);
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setRunning(false);
  }

  const selectedCount = rows.filter((r) => r.selected && r.status !== "done").length;

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={scoreSelected}
          disabled={running || selectedCount === 0}
          className="rounded bg-neutral-900 text-white px-4 py-2 text-sm disabled:opacity-40"
        >
          {running ? `Scoring ${progress.done}/${progress.total}…` : `Score selected (${selectedCount})`}
        </button>
        {running && (
          <span className="text-sm text-neutral-500">
            This calls Gemini once per CV — go grab a coffee.
          </span>
        )}
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-neutral-200">
            <th className="py-2 pr-2"></th>
            <th className="py-2 pr-2">File</th>
            <th className="py-2 pr-2">Role</th>
            <th className="py-2 pr-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.fileName} className="border-b border-neutral-100">
              <td className="py-2 pr-2">
                <input
                  type="checkbox"
                  checked={row.selected}
                  disabled={row.status === "done" || row.status === "scoring"}
                  onChange={(e) => setRow(row.fileName, { selected: e.target.checked })}
                />
              </td>
              <td className="py-2 pr-2 font-mono text-xs">{row.fileName}</td>
              <td className="py-2 pr-2">
                <select
                  value={row.role}
                  disabled={row.status === "done" || row.status === "scoring"}
                  onChange={(e) => setRow(row.fileName, { role: e.target.value as CandidateRole })}
                  className="border rounded px-1 py-0.5"
                >
                  <option value="PM">PM</option>
                  <option value="SPM">SPM</option>
                </select>
                {!row.inferredRole && row.status === "idle" && (
                  <span className="ml-2 text-amber-600 text-xs">confirm role</span>
                )}
              </td>
              <td className="py-2 pr-2">
                {row.status === "idle" && <span className="text-neutral-400">not scored</span>}
                {row.status === "scoring" && <span className="text-blue-600">scoring…</span>}
                {row.status === "done" && <span className="text-green-600">✓ scored</span>}
                {row.status === "error" && (
                  <span className="text-red-600" title={row.error}>
                    error — {row.error}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
