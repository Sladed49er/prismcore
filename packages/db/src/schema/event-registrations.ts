/**
 * Event registrations schema — the individual registrants for an association
 * event. Tenant-scoped.
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
import { associationEvents } from "./events";

export const eventRegistrationStatus = pgEnum("event_registration_status", [
  "registered",
  "waitlisted",
  "attended",
  "cancelled",
  "no_show",
]);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => associationEvents.id, { onDelete: "cascade" }),
    attendeeName: text("attendee_name").notNull(),
    email: text("email").notNull().default(""),
    status: eventRegistrationStatus("status").notNull().default("registered"),
    feePaidCents: integer("fee_paid_cents").notNull().default(0),
    registeredOn: date("registered_on"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("event_registrations_tenant_idx").on(t.tenantId),
    index("event_registrations_event_idx").on(t.eventId),
  ],
);

export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type NewEventRegistration = typeof eventRegistrations.$inferInsert;
