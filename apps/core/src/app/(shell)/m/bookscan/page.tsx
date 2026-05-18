import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listBookScanReports } from "@/lib/bookscan";
import {
  BookScanPanel,
  type BookScanReportDTO,
} from "@/components/bookscan-panel";

/**
 * BookScan module — AI book-of-business analyzer. Composition is computed in
 * trusted code; the AI interprets it into a narrative and structured findings.
 */
export default async function BookScanPage() {
  await requireModule("bookscan");
  const { config } = await loadCurrentTenant();
  const rows = await listBookScanReports(config.id);

  const reports: BookScanReportDTO[] = rows.map((r) => ({
    id: r.id,
    generatedBy: r.generatedBy,
    createdAt: r.createdAt.toISOString(),
    totalClients: r.totalClients,
    totalPolicies: r.totalPolicies,
    totalPremiumCents: r.totalPremiumCents,
    summary: r.summary,
    findings: r.findings,
    composition: r.composition ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">BookScan</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        An AI read on your whole book — portfolio mix, concentration risk,
        retention signals, and where the growth headroom is.
      </p>
      <BookScanPanel reports={reports} />
    </div>
  );
}
