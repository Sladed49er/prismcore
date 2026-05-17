import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadTerms, moduleLabel } from "@/lib/terminology";
import { listReports } from "@/lib/reports/store";
import { buildModelDescriptor } from "@/lib/reports/descriptor";
import { ReportsHub, type SavedReportDTO } from "@/components/reports-hub";

/**
 * Reports — the cross-entity report builder. Pick a base record type, pull in
 * columns from related records, filter, group and total, then run it. Every
 * query is structured (never SQL) and RLS-scoped to this tenant.
 */
export default async function ReportsPage() {
  await requireModule("reports");
  const { config } = await loadCurrentTenant();
  const terms = await loadTerms(config.id);

  const [reports] = await Promise.all([listReports(config.id)]);
  const model = buildModelDescriptor();

  const savedReports: SavedReportDTO[] = reports.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    spec: r.spec,
    createdBy: r.createdBy,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {moduleLabel(terms, "reports", "Reports")}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Build a report on anything in this workspace — pull columns across
        related records, filter, group, and total. Save the ones you run often.
      </p>
      <ReportsHub model={model} savedReports={savedReports} />
    </div>
  );
}
