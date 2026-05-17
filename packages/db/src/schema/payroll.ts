/**
 * Payroll schema — employee master, pay runs, and per-employee pay-run entries.
 * Tenant-scoped, RLS-isolated. (SSNs and tax IDs are intentionally NOT stored
 * here — encrypted PII is a hardening follow-on.)
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const employmentType = pgEnum("employment_type", ["w2", "contractor"]);
export const payRunStatus = pgEnum("pay_run_status", ["draft", "posted"]);

export const payrollEmployees = pgTable(
  "payroll_employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    title: text("title").notNull().default(""),
    employmentType: employmentType("employment_type").notNull().default("w2"),
    /** Gross pay per pay period, in cents. */
    periodPayCents: integer("period_pay_cents").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("payroll_employees_tenant_idx").on(t.tenantId)],
);

export const payRuns = pgTable(
  "pay_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    payDate: date("pay_date"),
    status: payRunStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("pay_runs_tenant_idx").on(t.tenantId)],
);

export const payRunEntries = pgTable(
  "pay_run_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    payRunId: uuid("pay_run_id")
      .notNull()
      .references(() => payRuns.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => payrollEmployees.id, { onDelete: "cascade" }),
    employeeName: text("employee_name").notNull(),
    grossCents: integer("gross_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    netCents: integer("net_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pay_run_entries_tenant_idx").on(t.tenantId),
    index("pay_run_entries_run_idx").on(t.payRunId),
  ],
);

export type PayrollEmployee = typeof payrollEmployees.$inferSelect;
export type PayRun = typeof payRuns.$inferSelect;
export type PayRunEntry = typeof payRunEntries.$inferSelect;
