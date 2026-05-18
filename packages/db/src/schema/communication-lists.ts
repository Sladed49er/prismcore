/**
 * Communication lists schema — committees, distribution lists, and member
 * groups an association uses to organize and reach its membership.
 * Tenant-scoped.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const communicationListType = pgEnum("communication_list_type", [
  "committee",
  "distribution",
  "working_group",
  "board",
]);

export const communicationLists = pgTable(
  "communication_lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: communicationListType("type").notNull().default("distribution"),
    purpose: text("purpose").notNull().default(""),
    memberCount: integer("member_count").notNull().default(0),
    ownerName: text("owner_name").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("communication_lists_tenant_idx").on(t.tenantId)],
);

export type CommunicationList = typeof communicationLists.$inferSelect;
export type NewCommunicationList = typeof communicationLists.$inferInsert;
