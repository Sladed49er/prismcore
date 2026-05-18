import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  taxEngagements,
  type TaxEngagement,
} from "@prismcore/db";

/**
 * Tax practice data layer — tax-preparation engagements.
 * RLS-scoped through `withTenantContext`.
 */

export type { TaxEngagement };

export type TaxEngagementType =
  | "form_1040"
  | "form_1120"
  | "form_1120s"
  | "form_1065"
  | "form_990"
  | "other";

export type TaxEngagementStatus =
  | "not_started"
  | "in_progress"
  | "in_review"
  | "filed"
  | "extended";

export async function listTaxEngagements(
  tenantId: string,
): Promise<TaxEngagement[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(taxEngagements)
      .where(eq(taxEngagements.tenantId, tenantId))
      .orderBy(desc(taxEngagements.dueDate)),
  );
}

export async function createTaxEngagement(input: {
  tenantId: string;
  clientName: string;
  taxYear: number;
  engagementType: TaxEngagementType;
  status: TaxEngagementStatus;
  dueDate: string | null;
  feeCents: number;
  preparerName: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(taxEngagements).values(input);
  });
}

export async function updateTaxEngagement(input: {
  tenantId: string;
  id: string;
  clientName: string;
  taxYear: number;
  engagementType: TaxEngagementType;
  status: TaxEngagementStatus;
  dueDate: string | null;
  feeCents: number;
  preparerName: string;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(taxEngagements)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(taxEngagements.id, id));
  });
}

export async function setTaxEngagementStatus(input: {
  tenantId: string;
  id: string;
  status: TaxEngagementStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(taxEngagements)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(taxEngagements.id, input.id));
  });
}

export async function deleteTaxEngagement(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(taxEngagements).where(eq(taxEngagements.id, id));
  });
}
