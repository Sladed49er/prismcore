/**
 * Membership payments schema — the dues-payment history for a member.
 * Tenant-scoped.
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

export const membershipPayments = pgTable(
  "membership_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull().default(0),
    paymentDate: date("payment_date"),
    /** check · card · ach · cash · other. */
    method: text("method").notNull().default(""),
    /** What the payment covers, e.g. "2026 annual dues". */
    period: text("period").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("membership_payments_tenant_idx").on(t.tenantId),
    index("membership_payments_membership_idx").on(t.membershipId),
  ],
);

export type MembershipPayment = typeof membershipPayments.$inferSelect;
export type NewMembershipPayment = typeof membershipPayments.$inferInsert;
