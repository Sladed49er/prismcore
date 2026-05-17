import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  invoices,
  clients,
  type Invoice,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { Invoice };
export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export interface InvoiceRow extends Invoice {
  clientName: string;
}

export async function listInvoices(tenantId: string): Promise<InvoiceRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ invoice: invoices, client: clients })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.tenantId, tenantId))
      .orderBy(desc(invoices.createdAt));
    return rows.map((r) => ({
      ...r.invoice,
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createInvoice(input: {
  tenantId: string;
  clientId: string;
  invoiceNumber: string;
  description: string;
  amountCents: number;
  status: InvoiceStatus;
  dueDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(invoices).values(input);
  });
}

export async function setInvoiceStatus(
  tenantId: string,
  invoiceId: string,
  status: InvoiceStatus,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(invoices)
      .set({ status, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
  });
}

export async function updateInvoice(input: {
  tenantId: string;
  id: string;
  clientId: string;
  invoiceNumber: string;
  description: string;
  amountCents: number;
  status: InvoiceStatus;
  dueDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(invoices)
      .set({
        clientId: input.clientId,
        invoiceNumber: input.invoiceNumber,
        description: input.description,
        amountCents: input.amountCents,
        status: input.status,
        dueDate: input.dueDate,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, input.id));
  });
}

export async function deleteInvoice(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(invoices).where(eq(invoices.id, id));
  });
}
