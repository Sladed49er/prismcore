import { asc, eq } from "drizzle-orm";
import {
  withTenantContext,
  quarterlyTaxPayments,
  type QuarterlyTaxPayment,
} from "@prismcore/db";

export type { QuarterlyTaxPayment };
export type QuarterlyTaxStatus = "scheduled" | "paid";

export async function listQuarterlyTaxes(
  tenantId: string,
): Promise<QuarterlyTaxPayment[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(quarterlyTaxPayments)
      .where(eq(quarterlyTaxPayments.tenantId, tenantId))
      .orderBy(asc(quarterlyTaxPayments.dueDate)),
  );
}

export async function createQuarterlyTax(input: {
  tenantId: string;
  taxType: string;
  year: string;
  quarter: string;
  estimatedCents: number;
  dueDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(quarterlyTaxPayments).values(input);
  });
}

export async function markQuarterlyTaxPaid(input: {
  tenantId: string;
  id: string;
  paidCents: number;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(quarterlyTaxPayments)
      .set({ status: "paid", paidCents: input.paidCents, updatedAt: new Date() })
      .where(eq(quarterlyTaxPayments.id, input.id));
  });
}
