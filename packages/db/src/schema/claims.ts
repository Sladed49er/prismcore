/** Claims schema — claims tracked against a policy. Tenant-scoped, RLS-isolated. */
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

export const claimStatus = pgEnum("claim_status", [
  "open",
  "investigating",
  "paid",
  "closed",
  "denied",
]);

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    claimNumber: text("claim_number").notNull(),
    dateOfLoss: date("date_of_loss"),
    description: text("description").notNull().default(""),
    status: claimStatus("status").notNull().default("open"),
    reserveCents: integer("reserve_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("claims_tenant_idx").on(t.tenantId),
    index("claims_policy_idx").on(t.policyId),
  ],
);

export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;
