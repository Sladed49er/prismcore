import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listContingencyIncome } from "@/lib/contingency";
import {
  ContingencyPanel,
  type ContingencyDTO,
} from "@/components/contingency-panel";

export default async function ContingencyPage() {
  await requireModule("commissions");
  const { config } = await loadCurrentTenant();
  const rows = await listContingencyIncome(config.id);

  const income: ContingencyDTO[] = rows.map((i) => ({
    id: i.id,
    carrierName: i.carrierName,
    year: i.year,
    incomeType: i.incomeType,
    expectedCents: i.expectedCents,
    receivedCents: i.receivedCents,
    status: i.status,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/commissions"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Commissions
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Contingency &amp; Bonus</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Carrier contingency, profit-share, and bonus income — tracked projected
        versus received by carrier and year.
      </p>
      <ContingencyPanel income={income} />
    </div>
  );
}
