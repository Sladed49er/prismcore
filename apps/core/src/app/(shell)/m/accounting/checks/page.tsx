import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listChecks } from "@/lib/checks";
import { ChecksPanel, type CheckDTO } from "@/components/checks-panel";

export default async function ChecksPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const rows = await listChecks(config.id);

  const checks: CheckDTO[] = rows.map((c) => ({
    id: c.id,
    checkNumber: c.checkNumber,
    payee: c.payee,
    amountCents: c.amountCents,
    checkDate: c.checkDate,
    memo: c.memo,
    status: c.status,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Checks &amp; Positive Pay</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The check register — record checks, track them through clearing, and
        export the printed-check list for bank positive-pay matching.
      </p>
      <ChecksPanel checks={checks} />
    </div>
  );
}
