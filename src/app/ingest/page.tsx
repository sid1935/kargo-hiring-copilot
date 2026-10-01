import { listApplicationFiles } from "@/lib/candidates";
import IngestClient from "./IngestClient";

export const dynamic = "force-dynamic";
// Raises the timeout for ingestAndScoreBatchAction, which can run several
// concurrent Gemini calls (each possibly retrying) in one request. Vercel
// clamps this to whatever the account's plan actually allows.
export const maxDuration = 300;

export default async function IngestPage() {
  const files = await listApplicationFiles();
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="font-display font-bold uppercase tracking-wide text-3xl mb-1">
        Ingest &amp; Score
      </h1>
      <p className="text-sm text-ink-soft mb-6">
        Files found in <code className="font-mono text-ink-faint">data/applications</code>. Confirm
        each role (PM / SPM) — pre-filled from the filename where it's obvious — then score.
      </p>
      <IngestClient initialFiles={files} />
    </main>
  );
}
