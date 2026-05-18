import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  taxEngagements,
  taxTimesheets,
  type TaxEngagement,
  type TaxTimesheet,
} from "@prismcore/db";

/**
 * Tax practice data layer — tax-preparation engagements and the time entries
 * logged against them. RLS-scoped through `withTenantContext`.
 */

export type { TaxEngagement, TaxTimesheet };

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

/* ── Timesheets ───────────────────────────────────────────────────── */

export interface TaxTimesheetRow extends TaxTimesheet {
  engagementLabel: string;
}

/** Every time entry for a tenant, with a label for its engagement. */
export async function listTaxTimesheets(
  tenantId: string,
): Promise<TaxTimesheetRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ entry: taxTimesheets, engagement: taxEngagements })
      .from(taxTimesheets)
      .leftJoin(
        taxEngagements,
        eq(taxTimesheets.engagementId, taxEngagements.id),
      )
      .where(eq(taxTimesheets.tenantId, tenantId))
      .orderBy(desc(taxTimesheets.workDate));
    return rows.map((r) => ({
      ...r.entry,
      engagementLabel: r.engagement
        ? `${r.engagement.clientName} (TY ${r.engagement.taxYear})`
        : "—",
    }));
  });
}

export async function createTaxTimesheet(input: {
  tenantId: string;
  engagementId: string;
  workDate: string | null;
  minutes: number;
  description: string;
  preparerName: string;
  billable: boolean;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(taxTimesheets).values(input);
  });
}

export async function deleteTaxTimesheet(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(taxTimesheets).where(eq(taxTimesheets.id, id));
  });
}
