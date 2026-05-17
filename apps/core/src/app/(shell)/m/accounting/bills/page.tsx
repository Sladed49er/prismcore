import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listBills, listVendors } from "@/lib/ap";
import { resolveStatusOptions } from "@/lib/status-options";
import {
  BillsPanel,
  STATUS_DEFAULTS,
  type BillDTO,
  type VendorOption,
} from "@/components/bills-panel";

export default async function BillsPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const [billRows, vendorRows, statusOptions] = await Promise.all([
    listBills(config.id),
    listVendors(config.id),
    resolveStatusOptions(config.id, "bill.status", STATUS_DEFAULTS),
  ]);

  const bills: BillDTO[] = billRows.map((b) => ({
    id: b.id,
    vendorId: b.vendorId,
    billNumber: b.billNumber,
    vendorName: b.vendorName,
    billDate: b.billDate,
    dueDate: b.dueDate,
    amountCents: b.amountCents,
    amountPaidCents: b.amountPaidCents,
    balanceCents: b.balanceCents,
    memo: b.memo,
    status: b.status,
  }));
  const vendors: VendorOption[] = vendorRows.map((v) => ({
    id: v.id,
    name: v.name,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Bills</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Vendor bills and accounts payable — entered, paid down, and reconciled.
      </p>
      <BillsPanel
        bills={bills}
        vendors={vendors}
        statusOptions={statusOptions}
      />
    </div>
  );
}
