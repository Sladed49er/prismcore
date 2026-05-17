/**
 * Renewals schema — the renewal worklist. Each row tracks one policy through its
 * renewal lifecycle. Tenant-scoped, RLS-isolated.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { policies } from "./policies";

export const renewalStage = pgEnum("renewal_stage", [
  "not_started",
  "in_progress",
  "quoted",
  "renewed",
  "lost",
]);

export const renewals = pgTable(
  "renewals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    stage: renewalStage("stage").notNull().default("not_started"),
    dueDate: date("due_date"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("renewals_tenant_idx").on(t.tenantId),
    index("renewals_policy_idx").on(t.policyId),
  ],
);

export type Renewal = typeof renewals.$inferSelect;
export type NewRenewal = typeof renewals.$inferInsert;
