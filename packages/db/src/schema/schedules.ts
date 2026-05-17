/** Insured schedules schema — items scheduled on a policy. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { policies } from "./policies";

export const scheduleItemType = pgEnum("schedule_item_type", [
  "vehicle",
  "driver",
  "location",
  "equipment",
  "other",
]);

export const insuredScheduleItems = pgTable(
  "insured_schedule_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    itemType: scheduleItemType("item_type").notNull().default("other"),
    description: text("description").notNull(),
    /** VIN, license number, address, serial — whatever identifies the item. */
    identifier: text("identifier").notNull().default(""),
    valueCents: integer("value_cents").notNull().default(0),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("insured_schedule_items_tenant_idx").on(t.tenantId),
    index("insured_schedule_items_policy_idx").on(t.policyId),
  ],
);

export type InsuredScheduleItem = typeof insuredScheduleItems.$inferSelect;
export type NewInsuredScheduleItem =
  typeof insuredScheduleItems.$inferInsert;
