/**
 * Membership dues invoices schema — billed dues for an association member.
 *
 * An invoice is raised for a period (e.g. "2026 Annual Dues"); payments
 * recorded against it accumulate in `paidCents`, and the invoice flips to
 * `paid` once covered. Overdue is computed (open + past `dueDate`).
 * Tenant-scoped, RLS-isolated.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { memberships } from "./memberships";

export const membershipDuesInvoices = pgTable(
  "membership_dues_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    /** What the invoice covers, e.g. "2026 Annual Dues". */
    periodLabel: text("period_label").notNull(),
    amountCents: integer("amount_cents").notNull().default(0),
    /** Sum of payments recorded against this invoice. */
    paidCents: integer("paid_cents").notNull().default(0),
    issueDate: date("issue_date"),
    dueDate: date("due_date"),
    /** "open" · "paid" · "void". Overdue is derived from dueDate. */
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("membership_dues_invoices_tenant_idx").on(t.tenantId),
    index("membership_dues_invoices_membership_idx").on(t.membershipId),
  ],
);

export type MembershipDuesInvoice =
  typeof membershipDuesInvoices.$inferSelect;
