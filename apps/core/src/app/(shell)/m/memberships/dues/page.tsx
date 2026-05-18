import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listMemberships } from "@/lib/memberships";
import { listDuesInvoices } from "@/lib/membership-dues";
import {
  MembershipDuesPanel,
  type DuesInvoiceDTO,
  type MemberOption,
} from "@/components/membership-dues-panel";

/** Membership dues — invoicing, payment, and overdue tracking. */
export default async function MembershipDuesPage() {
  await requireModule("memberships");
  const { config } = await loadCurrentTenant();
  const [invoiceRows, memberRows] = await Promise.all([
    listDuesInvoices(config.id),
    listMemberships(config.id),
  ]);

  const invoices: DuesInvoiceDTO[] = invoiceRows.map((i) => ({
    id: i.id,
    memberName: i.memberName,
    periodLabel: i.periodLabel,
    amountCents: i.amountCents,
    paidCents: i.paidCents,
    balanceCents: i.balanceCents,
    dueDate: i.dueDate,
    status: i.status,
    overdue: i.overdue,
  }));
  const members: MemberOption[] = memberRows.map((m) => ({
    id: m.id,
    name: m.memberName,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/memberships"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Memberships
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Dues Invoicing</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Raise dues invoices — one member at a time or an annual run across the
        whole roster — record payments, and track overdue balances.
      </p>
      <MembershipDuesPanel invoices={invoices} members={members} />
    </div>
  );
}
