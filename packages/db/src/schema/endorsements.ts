/** Policy endorsements schema — mid-term changes to a policy. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { policies } from "./policies";

export const endorsementStatus = pgEnum("endorsement_status", [
  "pending",
  "issued",
  "voided",
]);

export const policyEndorsements = pgTable(
  "policy_endorsements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    endorsementNumber: text("endorsement_number").notNull(),
    effectiveDate: date("effective_date"),
    description: text("description").notNull().default(""),
    /** Premium delta in cents — may be negative for a returned-premium change. */
    premiumChangeCents: integer("premium_change_cents").notNull().default(0),
    status: endorsementStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("policy_endorsements_tenant_idx").on(t.tenantId),
    index("policy_endorsements_policy_idx").on(t.policyId),
  ],
);

export type PolicyEndorsement = typeof policyEndorsements.$inferSelect;
export type NewPolicyEndorsement = typeof policyEndorsements.$inferInsert;
