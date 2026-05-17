/** Estimates schema — quotes / estimates issued to a client. Tenant-scoped. */
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
import { clients } from "./clients";

export const estimateStatus = pgEnum("estimate_status", [
  "draft",
  "sent",
  "accepted",
  "declined",
  "expired",
  "converted",
]);

export const estimates = pgTable(
  "estimates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    estimateNumber: text("estimate_number").notNull(),
    description: text("description").notNull().default(""),
    amountCents: integer("amount_cents").notNull().default(0),
    status: estimateStatus("status").notNull().default("draft"),
    validUntil: date("valid_until"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("estimates_tenant_idx").on(t.tenantId),
    index("estimates_client_idx").on(t.clientId),
  ],
);

export type Estimate = typeof estimates.$inferSelect;
export type NewEstimate = typeof estimates.$inferInsert;
