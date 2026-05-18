import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  memberships,
  membershipDuesInvoices,
  membershipPayments,
  type MembershipDuesInvoice,
} from "@prismcore/db";

/**
 * Membership dues — invoicing and payment.
 *
 * A dues invoice is raised for a member and a period; payments recorded
 * against it accumulate in `paidCents` and the invoice flips to `paid` once
 * covered. `generateAnnualDues` raises one invoice per active member in a
 * single pass. RLS-scoped through `withTenantContext`.
 */

export type { MembershipDuesInvoice };

export interface DuesInvoiceRow extends MembershipDuesInvoice {
  memberName: string;
  /** Open and past its due date. */
  overdue: boolean;
  balanceCents: number;
}

const today = (): string => new Date().toISOString().slice(0, 10);

export async function listDuesInvoices(
  tenantId: string,
): Promise<DuesInvoiceRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        invoice: membershipDuesInvoices,
        memberName: memberships.memberName,
      })
      .from(membershipDuesInvoices)
      .innerJoin(
        memberships,
        eq(memberships.id, membershipDuesInvoices.membershipId),
      )
      .where(eq(membershipDuesInvoices.tenantId, tenantId))
      .orderBy(desc(membershipDuesInvoices.createdAt));
    const now = today();
    return rows.map((r) => ({
      ...r.invoice,
      memberName: r.memberName,
      balanceCents: r.invoice.amountCents - r.invoice.paidCents,
      overdue:
        r.invoice.status === "open" &&
        r.invoice.dueDate !== null &&
        r.invoice.dueDate < now,
    }));
  });
}

/** Raise a single dues invoice for a member. */
export async function generateDuesInvoice(input: {
  tenantId: string;
  membershipId: string;
  periodLabel: string;
  amountCents: number;
  dueDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(membershipDuesInvoices).values({
      tenantId: input.tenantId,
      membershipId: input.membershipId,
      periodLabel: input.periodLabel,
      amountCents: input.amountCents,
      issueDate: today(),
      dueDate: input.dueDate,
    });
  });
}

/**
 * Raise a dues invoice for every active member, billing each member's own
 * `duesCents`. Members who already have an invoice for this period are
 * skipped. Returns how many invoices were raised.
 */
export async function generateAnnualDues(
  tenantId: string,
  periodLabel: string,
  dueDate: string | null,
): Promise<{ created: number }> {
  return withTenantContext(tenantId, async (tx) => {
    const members = await tx
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, tenantId),
          eq(memberships.status, "active"),
        ),
      );
    const existing = await tx
      .select({ membershipId: membershipDuesInvoices.membershipId })
      .from(membershipDuesInvoices)
      .where(
        and(
          eq(membershipDuesInvoices.tenantId, tenantId),
          eq(membershipDuesInvoices.periodLabel, periodLabel),
        ),
      );
    const already = new Set(existing.map((e) => e.membershipId));
    const rows = members
      .filter((m) => !already.has(m.id) && m.duesCents > 0)
      .map((m) => ({
        tenantId,
        membershipId: m.id,
        periodLabel,
        amountCents: m.duesCents,
        issueDate: today(),
        dueDate,
      }));
    if (rows.length > 0) {
      await tx.insert(membershipDuesInvoices).values(rows);
    }
    return { created: rows.length };
  });
}

/** Record a payment against a dues invoice and update its balance. */
export async function recordDuesPayment(input: {
  tenantId: string;
  invoiceId: string;
  amountCents: number;
  method: string;
  paymentDate: string | null;
}): Promise<{ ok: boolean; message: string }> {
  return withTenantContext(input.tenantId, async (tx) => {
    const [invoice] = await tx
      .select()
      .from(membershipDuesInvoices)
      .where(eq(membershipDuesInvoices.id, input.invoiceId));
    if (!invoice) return { ok: false, message: "Invoice not found." };
    if (invoice.status === "void") {
      return { ok: false, message: "This invoice is void." };
    }

    await tx.insert(membershipPayments).values({
      tenantId: input.tenantId,
      membershipId: invoice.membershipId,
      invoiceId: invoice.id,
      amountCents: input.amountCents,
      paymentDate: input.paymentDate,
      method: input.method,
      period: invoice.periodLabel,
    });

    const paidCents = invoice.paidCents + input.amountCents;
    await tx
      .update(membershipDuesInvoices)
      .set({
        paidCents,
        status: paidCents >= invoice.amountCents ? "paid" : "open",
      })
      .where(eq(membershipDuesInvoices.id, invoice.id));
    return {
      ok: true,
      message:
        paidCents >= invoice.amountCents
          ? "Payment recorded — invoice paid in full."
          : "Payment recorded.",
    };
  });
}

export async function voidDuesInvoice(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(membershipDuesInvoices)
      .set({ status: "void" })
      .where(eq(membershipDuesInvoices.id, id));
  });
}
