/** Producers schema — the producer/agent master. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const producerStatus = pgEnum("producer_status", [
  "active",
  "inactive",
]);

export const producers = pgTable(
  "producers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull().default(""),
    email: text("email").notNull().default(""),
    defaultRatePercent: text("default_rate_percent").notNull().default(""),
    status: producerStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("producers_tenant_idx").on(t.tenantId)],
);

export type Producer = typeof producers.$inferSelect;
export type NewProducer = typeof producers.$inferInsert;
