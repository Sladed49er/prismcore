/**
 * Ticketing schema — the per-tenant support / request system.
 *
 * Every ticket and comment carries `tenant_id`: a tenant only ever sees its own
 * tickets (siloed), while platform admins see across all tenants. Same pattern as
 * the PIA West request portal — the customer files requests, the team works them.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const ticketStatus = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
export const ticketPriority = pgEnum("ticket_priority", [
  "low",
  "normal",
  "high",
]);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("Question"),
    status: ticketStatus("status").notNull().default("open"),
    priority: ticketPriority("priority").notNull().default("normal"),
    createdByEmail: text("created_by_email"),
    createdByName: text("created_by_name").notNull().default("User"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("tickets_tenant_idx").on(t.tenantId)],
);

export const ticketComments = pgTable(
  "ticket_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    /** Denormalized for tenant-scoped queries. */
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    authorName: text("author_name").notNull().default("User"),
    /** True when posted by a platform admin (the Prism team). */
    fromAdmin: boolean("from_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ticket_comments_ticket_idx").on(t.ticketId)],
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketComment = typeof ticketComments.$inferSelect;
