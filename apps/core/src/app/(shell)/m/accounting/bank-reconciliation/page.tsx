import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listReconciliations } from "@/lib/bank";
import {
  BankReconciliationPanel,
  type ReconciliationDTO,
} from "@/components/bank-reconciliation-panel";

export default async function BankReconciliationPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const rows = await listReconciliations(config.id);

  const reconciliations: ReconciliationDTO[] = rows.map((r) => ({
    id: r.id,
    accountName: r.accountName,
    statementDate: r.statementDate,
    statementBalanceCents: r.statementBalanceCents,
    reconciledBalanceCents: r.reconciledBalanceCents,
    differenceCents: r.differenceCents,
    status: r.status,
    notes: r.notes,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Bank Reconciliation</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Reconcile each bank statement against the books — the difference must be
        zero to tie out.
      </p>
      <BankReconciliationPanel reconciliations={reconciliations} />
    </div>
  );
}
