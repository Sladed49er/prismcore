/**
 * Events schema — association events: conferences, workshops, webinars, and
 * meetings, with registration, capacity, and continuing-education credits.
 * Tenant-scoped.
 */
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

export const eventType = pgEnum("event_type", [
  "conference",
  "workshop",
  "webinar",
  "meeting",
  "networking",
]);

export const eventStatus = pgEnum("event_status", [
  "planned",
  "registration_open",
  "full",
  "completed",
  "cancelled",
]);

export const associationEvents = pgTable(
  "association_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: eventType("type").notNull().default("workshop"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    location: text("location").notNull().default(""),
    capacity: integer("capacity").notNull().default(0),
    registeredCount: integer("registered_count").notNull().default(0),
    /** Continuing-education credit-hours offered. */
    ceCredits: integer("ce_credits").notNull().default(0),
    feeCents: integer("fee_cents").notNull().default(0),
    status: eventStatus("status").notNull().default("planned"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("association_events_tenant_idx").on(t.tenantId)],
);

export type AssociationEvent = typeof associationEvents.$inferSelect;
export type NewAssociationEvent = typeof associationEvents.$inferInsert;
