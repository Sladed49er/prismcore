import { asc, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  vendors,
  bills,
  type Vendor,
  type Bill,
} from "@prismcore/db";

export type { Vendor, Bill };
export type VendorType = "carrier" | "supplier" | "service" | "other";

/* ── Vendors ────────────────────────────────────────────────────── */

export async function listVendors(tenantId: string): Promise<Vendor[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(vendors)
      .where(eq(vendors.tenantId, tenantId))
      .orderBy(asc(vendors.name)),
  );
}

export async function createVendor(input: {
  tenantId: string;
  name: string;
  type: VendorType;
  email: string;
  phone: string;
  paymentTerms: string;
  is1099: boolean;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(vendors).values(input);
  });
}

export async function updateVendor(input: {
  tenantId: string;
  id: string;
  name: string;
  type: VendorType;
  email: string;
  phone: string;
  paymentTerms: string;
  is1099: boolean;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(vendors)
      .set({
        name: input.name,
        type: input.type,
        email: input.email,
        phone: input.phone,
        paymentTerms: input.paymentTerms,
        is1099: input.is1099,
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, input.id));
  });
}

export async function deleteVendor(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(vendors).where(eq(vendors.id, id));
  });
}

/* ── Bills ──────────────────────────────────────────────────────── */

export interface BillRow extends Bill {
  vendorName: string;
  balanceCents: number;
}

export async function listBills(tenantId: string): Promise<BillRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ bill: bills, vendor: vendors })
      .from(bills)
      .leftJoin(vendors, eq(bills.vendorId, vendors.id))
      .where(eq(bills.tenantId, tenantId))
      .orderBy(desc(bills.createdAt));
    return rows.map((r) => ({
      ...r.bill,
      vendorName: r.vendor?.name ?? "—",
      balanceCents: r.bill.amountCents - r.bill.amountPaidCents,
    }));
  });
}

export async function createBill(input: {
  tenantId: string;
  vendorId: string;
  billNumber: string;
  billDate: string | null;
  dueDate: string | null;
  amountCents: number;
  memo: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(bills).values(input);
  });
}

/** Record a payment against a bill; status follows from amount paid vs. due. */
export async function recordBillPayment(
  tenantId: string,
  billId: string,
  paymentCents: number,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(bills)
      .where(eq(bills.id, billId))
      .limit(1);
    const bill = rows[0];
    if (!bill) return;
    const paid = Math.min(
      bill.amountCents,
      bill.amountPaidCents + Math.max(0, paymentCents),
    );
    const status =
      paid >= bill.amountCents && bill.amountCents > 0
        ? "paid"
        : paid > 0
          ? "partial"
          : "pending";
    await tx
      .update(bills)
      .set({ amountPaidCents: paid, status, updatedAt: new Date() })
      .where(eq(bills.id, billId));
  });
}
