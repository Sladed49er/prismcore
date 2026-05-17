import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  tenantReports,
  type TenantReport,
} from "@prismcore/db";
import type { ReportSpec } from "@/lib/reports/spec";

/**
 * Saved-report storage — reports-as-data. Every call is RLS-scoped via
 * `withTenantContext`, so a tenant only ever sees its own reports.
 */

export interface SavedReport {
  id: string;
  name: string;
  description: string | null;
  spec: ReportSpec;
  createdBy: string | null;
  updatedAt: Date;
}

function toSaved(row: TenantReport): SavedReport {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    spec: row.spec as unknown as ReportSpec,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
  };
}

export async function listReports(tenantId: string): Promise<SavedReport[]> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tenantReports)
      .where(eq(tenantReports.tenantId, tenantId))
      .orderBy(desc(tenantReports.updatedAt)),
  );
  return rows.map(toSaved);
}

export async function getReport(
  tenantId: string,
  id: string,
): Promise<SavedReport | null> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tenantReports)
      .where(
        and(eq(tenantReports.tenantId, tenantId), eq(tenantReports.id, id)),
      )
      .limit(1),
  );
  return rows[0] ? toSaved(rows[0]) : null;
}

/** Insert a new saved report, or update an existing one. Returns its id. */
export async function saveReport(
  tenantId: string,
  input: {
    id?: string;
    name: string;
    description?: string | null;
    spec: ReportSpec;
    createdBy?: string;
  },
): Promise<string> {
  const spec = input.spec as unknown as Record<string, unknown>;
  return withTenantContext(tenantId, async (tx) => {
    if (input.id) {
      await tx
        .update(tenantReports)
        .set({
          name: input.name,
          description: input.description ?? null,
          spec,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tenantReports.tenantId, tenantId),
            eq(tenantReports.id, input.id),
          ),
        );
      return input.id;
    }
    const [row] = await tx
      .insert(tenantReports)
      .values({
        tenantId,
        name: input.name,
        description: input.description ?? null,
        spec,
        createdBy: input.createdBy ?? null,
      })
      .returning({ id: tenantReports.id });
    return row?.id ?? "";
  });
}

export async function deleteReport(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(tenantReports)
      .where(
        and(eq(tenantReports.tenantId, tenantId), eq(tenantReports.id, id)),
      );
  });
}
