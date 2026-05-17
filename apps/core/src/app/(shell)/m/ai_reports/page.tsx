import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadTerms, moduleLabel } from "@/lib/terminology";
import { ReportAssistantPanel } from "@/components/report-assistant-panel";

/**
 * AI Reports — the natural-language report builder. Describe a report and the
 * assistant assembles a structured ReportSpec and runs it. The assistant only
 * ever emits a spec (never SQL); the engine runs it RLS-scoped to this tenant.
 */
export default async function AiReportsPage() {
  await requireModule("ai_reports");
  const { config } = await loadCurrentTenant();
  const terms = await loadTerms(config.id);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {moduleLabel(terms, "ai_reports", "AI Reports")}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Ask for any report in plain language — the assistant builds it across
        your clients, policies, claims, invoices, and calls, runs it, and can
        save it to{" "}
        <Link href="/m/reports" className="text-indigo-600 hover:underline">
          Reports
        </Link>{" "}
        to re-run later.
      </p>
      <ReportAssistantPanel />
    </div>
  );
}
