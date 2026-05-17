import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  surplusLinesTax,
  type SurplusLinesTax,
} from "@prismcore/db";

export type { SurplusLinesTax };
export type SurplusLinesStatus = "pending" | "filed" | "paid";

export interface SurplusLinesRow extends SurplusLinesTax {
  totalDueCents: number;
}

/** Tax = premium × rate%. Total due adds stamping + filing fees. */
function totalDue(r: SurplusLinesTax): number {
  return r.taxCents + r.stampingFeeCents + r.filingFeeCents;
}

export async function listSurplusLines(
  tenantId: string,
): Promise<SurplusLinesRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(surplusLinesTax)
      .where(eq(surplusLinesTax.tenantId, tenantId))
      .orderBy(desc(surplusLinesTax.createdAt));
    return rows.map((r) => ({ ...r, totalDueCents: totalDue(r) }));
  });
}

export async function createSurplusLines(input: {
  tenantId: string;
  policyReference: string;
  state: string;
  premiumCents: number;
  taxRatePercent: string;
  stampingFeeCents: number;
  filingFeeCents: number;
  dueDate: string | null;
}): Promise<void> {
  const rate = Number.parseFloat(input.taxRatePercent) || 0;
  const taxCents = Math.round((input.premiumCents * rate) / 100);
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(surplusLinesTax).values({ ...input, taxCents });
  });
}

export async function setSurplusLinesStatus(input: {
  tenantId: string;
  id: string;
  status: SurplusLinesStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(surplusLinesTax)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(surplusLinesTax.id, input.id));
  });
}
