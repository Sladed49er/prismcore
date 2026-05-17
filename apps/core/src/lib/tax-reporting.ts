/**
 * Year-end tax reporting — W-2 wages and 1099-NEC non-employee compensation.
 * Pure computed views over payroll and accounts-payable data; no own tables.
 *
 *  - W-2:   posted pay-run entries for W-2 employees, by pay-date year.
 *  - 1099:  contractor pay-run entries + paid bills to 1099-flagged vendors.
 */
import { eq } from "drizzle-orm";
import {
  withTenantContext,
  payrollEmployees,
  payRuns,
  payRunEntries,
  vendors,
  bills,
} from "@prismcore/db";

export interface W2Row {
  employeeId: string;
  name: string;
  title: string;
  wagesCents: number;
  taxWithheldCents: number;
  netCents: number;
}

export interface Form1099Row {
  name: string;
  source: "Contractor" | "Vendor";
  amountCents: number;
}

export interface TaxReport {
  year: string;
  w2: W2Row[];
  form1099: Form1099Row[];
  totalW2WagesCents: number;
  totalW2TaxCents: number;
  total1099Cents: number;
}

export async function taxReport(
  tenantId: string,
  year: string,
): Promise<TaxReport> {
  return withTenantContext(tenantId, async (tx) => {
    const emps = await tx
      .select()
      .from(payrollEmployees)
      .where(eq(payrollEmployees.tenantId, tenantId));
    const runs = await tx
      .select()
      .from(payRuns)
      .where(eq(payRuns.tenantId, tenantId));
    const entries = await tx
      .select()
      .from(payRunEntries)
      .where(eq(payRunEntries.tenantId, tenantId));
    const vnds = await tx
      .select()
      .from(vendors)
      .where(eq(vendors.tenantId, tenantId));
    const blls = await tx
      .select()
      .from(bills)
      .where(eq(bills.tenantId, tenantId));

    // Pay runs that landed in the reporting year and are posted.
    const runInYear = new Map<string, boolean>();
    for (const r of runs) {
      runInYear.set(
        r.id,
        r.status === "posted" &&
          !!r.payDate &&
          r.payDate.slice(0, 4) === year,
      );
    }

    const w2acc = new Map<string, { gross: number; tax: number; net: number }>();
    const contractorAcc = new Map<string, number>();
    const empType = new Map(emps.map((e) => [e.id, e.employmentType]));
    for (const e of entries) {
      if (!runInYear.get(e.payRunId)) continue;
      if (empType.get(e.employeeId) === "w2") {
        const a = w2acc.get(e.employeeId) ?? { gross: 0, tax: 0, net: 0 };
        a.gross += e.grossCents;
        a.tax += e.taxCents;
        a.net += e.netCents;
        w2acc.set(e.employeeId, a);
      } else if (empType.get(e.employeeId) === "contractor") {
        contractorAcc.set(
          e.employeeId,
          (contractorAcc.get(e.employeeId) ?? 0) + e.grossCents,
        );
      }
    }

    const w2: W2Row[] = emps
      .filter((e) => e.employmentType === "w2")
      .map((e) => {
        const a = w2acc.get(e.id) ?? { gross: 0, tax: 0, net: 0 };
        return {
          employeeId: e.id,
          name: e.name,
          title: e.title,
          wagesCents: a.gross,
          taxWithheldCents: a.tax,
          netCents: a.net,
        };
      })
      .filter((r) => r.wagesCents !== 0);

    const contractor1099: Form1099Row[] = emps
      .filter((e) => e.employmentType === "contractor")
      .map((e) => ({
        name: e.name,
        source: "Contractor" as const,
        amountCents: contractorAcc.get(e.id) ?? 0,
      }))
      .filter((r) => r.amountCents !== 0);

    // 1099-flagged vendors — sum bill payments dated in the reporting year.
    const is1099 = new Map(vnds.map((v) => [v.id, v.is1099]));
    const vendorAcc = new Map<string, number>();
    for (const b of blls) {
      if (!b.billDate || b.billDate.slice(0, 4) !== year) continue;
      if (!is1099.get(b.vendorId)) continue;
      vendorAcc.set(
        b.vendorId,
        (vendorAcc.get(b.vendorId) ?? 0) + b.amountPaidCents,
      );
    }
    const vendor1099: Form1099Row[] = vnds
      .filter((v) => v.is1099)
      .map((v) => ({
        name: v.name,
        source: "Vendor" as const,
        amountCents: vendorAcc.get(v.id) ?? 0,
      }))
      .filter((r) => r.amountCents !== 0);

    const form1099 = [...contractor1099, ...vendor1099];

    return {
      year,
      w2,
      form1099,
      totalW2WagesCents: w2.reduce((s, r) => s + r.wagesCents, 0),
      totalW2TaxCents: w2.reduce((s, r) => s + r.taxWithheldCents, 0),
      total1099Cents: form1099.reduce((s, r) => s + r.amountCents, 0),
    };
  });
}
