import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCommissionStatements } from "@/lib/commission-statements";
import {
  CommissionStatementsPanel,
  type CommissionStatementDTO,
} from "@/components/commission-statements-panel";

export default async function CommissionStatementsPage() {
  await requireModule("commissions");
  const { config } = await loadCurrentTenant();
  const rows = await listCommissionStatements(config.id);

  const statements: CommissionStatementDTO[] = rows.map((s) => ({
    id: s.id,
    carrierName: s.carrierName,
    statementDate: s.statementDate,
    periodLabel: s.periodLabel,
    expectedCents: s.expectedCents,
    reportedCents: s.reportedCents,
    varianceCents: s.varianceCents,
    status: s.status,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/commissions"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Commissions
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Carrier Statements</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Commission statements received from carriers — expected versus
        reported, reconciled down to the variance.
      </p>
      <CommissionStatementsPanel statements={statements} />
    </div>
  );
}
