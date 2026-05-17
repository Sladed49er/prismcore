import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listAccounts } from "@/lib/gl";
import {
  ChartOfAccountsPanel,
  type AccountDTO,
} from "@/components/chart-of-accounts-panel";

export default async function ChartOfAccountsPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const rows = await listAccounts(config.id);

  const accounts: AccountDTO[] = rows.map((a) => ({
    id: a.id,
    accountNumber: a.accountNumber,
    name: a.name,
    type: a.type,
    subtype: a.subtype,
    isActive: a.isActive,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Chart of Accounts</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The GL account master — every account that journal entries post to.
      </p>
      <ChartOfAccountsPanel accounts={accounts} />
    </div>
  );
}
