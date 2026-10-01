import { getCandidateViews } from "@/lib/dashboard-data";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const candidates = await getCandidateViews();
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="font-display font-bold uppercase tracking-wide text-3xl mb-1">
        Hiring Dashboard
      </h1>
      <p className="text-sm text-ink-soft mb-6">
        The system recommends. You decide. That decision is the last thing you touch.
      </p>
      <DashboardClient candidates={candidates} />
    </main>
  );
}
