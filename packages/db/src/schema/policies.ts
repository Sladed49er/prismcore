/**
 * Policies schema — insurance policies written on a client. Tenant-scoped,
 * RLS-isolated. `customValues` holds per-tenant custom-field values for the
 * "policy" entity.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  date,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { clients } from "./clients";

export const policyStatus = pgEnum("policy_status", [
  "quoted",
  "active",
  "expired",
  "cancelled",
]);

export const policies = pgTable(
  "policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    policyNumber: text("policy_number").notNull(),
    lineOfBusiness: text("line_of_business").notNull().default(""),
    carrier: text("carrier").notNull().default(""),
    status: policyStatus("status").notNull().default("quoted"),
    effectiveDate: date("effective_date"),
    expirationDate: date("expiration_date"),
    premiumCents: integer("premium_cents").notNull().default(0),
    customValues: jsonb("custom_values")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("policies_tenant_idx").on(t.tenantId),
    index("policies_client_idx").on(t.clientId),
  ],
);

export type Policy = typeof policies.$inferSelect;
export type NewPolicy = typeof policies.$inferInsert;
