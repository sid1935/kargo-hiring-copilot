"use client";

import { useRef, useState } from "react";
import { ingestAndScoreBatchAction, uploadCvAction } from "@/app/actions";
import type { ApplicationFile } from "@/lib/candidates";
import type { CandidateRole } from "@/lib/types";

// Matches the server's internal concurrency (SCORE_CONCURRENCY in actions.ts)
// so each chunk resolves in roughly one "wave" — gives incremental progress
// updates without splitting work more finely than the server already does.
const CHUNK_SIZE = 8;

// Duplicated (not imported) from extract-text.ts deliberately — that module
// pulls in Node-only file-parsing libraries that have no business in a
// client bundle.
function inferRoleFromFilename(fileName: string): CandidateRole | null {
  const lower = fileName.toLowerCase();
  if (lower.startsWith("spm_") || lower.startsWith("spm-")) return "SPM";
  if (lower.startsWith("pm_") || lower.startsWith("pm-")) return "PM";
  return null;
}

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
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setRow(fileName: string, patch: Partial<RowState>) {
    setRows((rs) => rs.map((r) => (r.fileName === fileName ? { ...r, ...patch } : r)));
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadMessage(null);
    try {
      const formData = new FormData();
      for (const file of fileList) formData.append("files", file);

      const { added, skipped } = await uploadCvAction(formData);

      if (added.length > 0) {
        setRows((rs) => [
          ...rs,
          ...added.map((fileName) => {
            const inferredRole = inferRoleFromFilename(fileName);
            return {
              fileName,
              inferredRole,
              alreadyIngested: false,
              role: inferredRole ?? ("PM" as CandidateRole),
              selected: true,
              status: "idle" as const,
            };
          }),
        ]);
      }

      const parts: string[] = [];
      if (added.length > 0) parts.push(`Added ${added.length}: ${added.join(", ")}`);
      if (skipped.length > 0) {
        parts.push(`Skipped ${skipped.length}: ${skipped.map((s) => `${s.fileName} (${s.reason})`).join("; ")}`);
      }
      setUploadMessage(parts.join(" — ") || null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function scoreSelected() {
    const targets = rows.filter((r) => r.selected && r.status !== "done");
    setRunning(true);
    setProgress({ done: 0, total: targets.length });

    for (const target of targets) {
      setRow(target.fileName, { status: "scoring", error: undefined });
    }

    for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
      const chunk = targets.slice(i, i + CHUNK_SIZE);
      const results = await ingestAndScoreBatchAction(
        chunk.map((r) => ({ fileName: r.fileName, role: r.role })),
      );
      for (const r of results) {
        setRow(r.fileName, r.ok ? { status: "done" } : { status: "error", error: r.error });
      }
      setProgress((p) => ({ ...p, done: p.done + chunk.length }));
    }

    setRunning(false);
  }

  const selectedCount = rows.filter((r) => r.selected && r.status !== "done").length;

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={scoreSelected}
          disabled={running || selectedCount === 0}
          className="rounded-sm bg-accent text-bg font-semibold px-4 py-2 text-sm hover:bg-accent-strong transition-colors disabled:opacity-40"
        >
          {running ? `Scoring ${progress.done}/${progress.total}…` : `Score selected (${selectedCount})`}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-sm border border-line text-ink font-semibold px-4 py-2 text-sm hover:border-accent transition-colors disabled:opacity-40"
        >
          {uploading ? "Uploading…" : "Add CV"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        {running && (
          <span className="text-sm text-ink-faint">
            Scoring up to {CHUNK_SIZE} at a time — much faster than one-by-one, still worth a coffee.
          </span>
        )}
      </div>
      {uploadMessage && <p className="text-xs text-ink-faint mb-4">{uploadMessage}</p>}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-line">
            <th className="py-2 pr-2"></th>
            <th className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">File</th>
            <th className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Role</th>
            <th className="py-2 pr-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.fileName} className="border-b border-line">
              <td className="py-2 pr-2">
                <input
                  type="checkbox"
                  checked={row.selected}
                  disabled={row.status === "done" || row.status === "scoring"}
                  onChange={(e) => setRow(row.fileName, { selected: e.target.checked })}
                  className="accent-accent"
                />
              </td>
              <td className="py-2 pr-2 font-mono text-xs text-ink-soft">{row.fileName}</td>
              <td className="py-2 pr-2">
                <select
                  value={row.role}
                  disabled={row.status === "done" || row.status === "scoring"}
                  onChange={(e) => setRow(row.fileName, { role: e.target.value as CandidateRole })}
                  className="bg-surface border border-line rounded-sm px-1.5 py-1 text-ink"
                >
                  <option value="PM">PM</option>
                  <option value="SPM">SPM</option>
                </select>
                {!row.inferredRole && row.status === "idle" && (
                  <span className="ml-2 text-warn text-xs">confirm role</span>
                )}
              </td>
              <td className="py-2 pr-2">
                {row.status === "idle" && <span className="text-ink-faint">not scored</span>}
                {row.status === "scoring" && <span className="text-teal">scoring…</span>}
                {row.status === "done" && <span className="text-good">✓ scored</span>}
                {row.status === "error" && (
                  <span className="text-accent" title={row.error}>
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
