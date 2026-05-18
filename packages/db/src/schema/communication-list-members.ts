/**
 * Communication list members schema — the people on a committee or
 * distribution list. Tenant-scoped.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { communicationLists } from "./communication-lists";

export const communicationListMembers = pgTable(
  "communication_list_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => communicationLists.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    /** Role on the list — member, chair, admin. */
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("communication_list_members_tenant_idx").on(t.tenantId),
    index("communication_list_members_list_idx").on(t.listId),
  ],
);

export type CommunicationListMember =
  typeof communicationListMembers.$inferSelect;
export type NewCommunicationListMember =
  typeof communicationListMembers.$inferInsert;
