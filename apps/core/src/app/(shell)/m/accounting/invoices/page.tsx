import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listInvoices } from "@/lib/accounting";
import { listClients, clientDisplayName } from "@/lib/clients";
import { resolveStatusOptions } from "@/lib/status-options";
import {
  AccountingPanel,
  STATUS_DEFAULTS,
  type InvoiceDTO,
  type ClientOption,
} from "@/components/accounting-panel";

export default async function InvoicesPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const [invoiceRows, clientRows, statusOptions] = await Promise.all([
    listInvoices(config.id),
    listClients(config.id),
    resolveStatusOptions(config.id, "invoice.status", STATUS_DEFAULTS),
  ]);

  const invoices: InvoiceDTO[] = invoiceRows.map((i) => ({
    id: i.id,
    clientId: i.clientId,
    invoiceNumber: i.invoiceNumber,
    clientName: i.clientName,
    description: i.description,
    amountCents: i.amountCents,
    status: i.status,
    dueDate: i.dueDate,
  }));
  const clients: ClientOption[] = clientRows.map((c) => ({
    id: c.id,
    name: clientDisplayName(c),
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Invoices</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Client billing and accounts receivable — drafted, sent, and reconciled.
      </p>
      <AccountingPanel
        invoices={invoices}
        clients={clients}
        statusOptions={statusOptions}
      />
    </div>
  );
}
