import { asc, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  payrollEmployees,
  payRuns,
  payRunEntries,
  type PayrollEmployee,
  type PayRun,
  type PayRunEntry,
} from "@prismcore/db";

export type { PayrollEmployee, PayRun, PayRunEntry };
export type EmploymentType = "w2" | "contractor";

/** Flat withholding estimate applied to gross pay when a run is generated. */
const TAX_RATE = 0.2;

/* ── Employees ──────────────────────────────────────────────────── */

export async function listEmployees(
  tenantId: string,
): Promise<PayrollEmployee[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(payrollEmployees)
      .where(eq(payrollEmployees.tenantId, tenantId))
      .orderBy(asc(payrollEmployees.name)),
  );
}

export async function createEmployee(input: {
  tenantId: string;
  name: string;
  email: string;
  title: string;
  employmentType: EmploymentType;
  periodPayCents: number;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(payrollEmployees).values(input);
  });
}

/* ── Pay runs ───────────────────────────────────────────────────── */

export interface PayRunRow extends PayRun {
  totalGrossCents: number;
  totalNetCents: number;
  entryCount: number;
}

export async function listPayRuns(tenantId: string): Promise<PayRunRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const runs = await tx
      .select()
      .from(payRuns)
      .where(eq(payRuns.tenantId, tenantId))
      .orderBy(desc(payRuns.createdAt));
    const entries = await tx
      .select()
      .from(payRunEntries)
      .where(eq(payRunEntries.tenantId, tenantId));

    const byRun = new Map<string, { gross: number; net: number; n: number }>();
    for (const e of entries) {
      const acc = byRun.get(e.payRunId) ?? { gross: 0, net: 0, n: 0 };
      acc.gross += e.grossCents;
      acc.net += e.netCents;
      acc.n += 1;
      byRun.set(e.payRunId, acc);
    }
    return runs.map((r) => ({
      ...r,
      totalGrossCents: byRun.get(r.id)?.gross ?? 0,
      totalNetCents: byRun.get(r.id)?.net ?? 0,
      entryCount: byRun.get(r.id)?.n ?? 0,
    }));
  });
}

export async function listPayRunEntries(
  tenantId: string,
): Promise<PayRunEntry[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(payRunEntries)
      .where(eq(payRunEntries.tenantId, tenantId)),
  );
}

/**
 * Create a pay run and auto-generate an entry for every active employee —
 * gross from their period pay, a flat withholding estimate, net after tax.
 */
export async function createPayRun(input: {
  tenantId: string;
  label: string;
  payDate: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    const inserted = await tx
      .insert(payRuns)
      .values({
        tenantId: input.tenantId,
        label: input.label,
        payDate: input.payDate,
        status: "draft",
      })
      .returning();
    const run = inserted[0]!;

    const employees = await tx
      .select()
      .from(payrollEmployees)
      .where(eq(payrollEmployees.tenantId, input.tenantId));
    const active = employees.filter((e) => e.isActive);

    if (active.length > 0) {
      await tx.insert(payRunEntries).values(
        active.map((e) => {
          const gross = e.periodPayCents;
          const tax = Math.round(gross * TAX_RATE);
          return {
            tenantId: input.tenantId,
            payRunId: run.id,
            employeeId: e.id,
            employeeName: e.name,
            grossCents: gross,
            taxCents: tax,
            netCents: gross - tax,
          };
        }),
      );
    }
  });
}

export async function setPayRunStatus(
  tenantId: string,
  runId: string,
  status: "draft" | "posted",
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(payRuns)
      .set({ status, updatedAt: new Date() })
      .where(eq(payRuns.id, runId));
  });
}
