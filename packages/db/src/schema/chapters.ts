/**
 * Chapters schema — the geographic and functional chapters of an association.
 * Tenant-scoped.
 */
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

export const chapterType = pgEnum("chapter_type", [
  "geographic",
  "functional",
  "student",
]);

export const chapterStatus = pgEnum("chapter_status", [
  "active",
  "forming",
  "inactive",
]);

export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: chapterType("type").notNull().default("geographic"),
    region: text("region").notNull().default(""),
    leaderName: text("leader_name").notNull().default(""),
    memberCount: integer("member_count").notNull().default(0),
    status: chapterStatus("status").notNull().default("active"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("chapters_tenant_idx").on(t.tenantId)],
);

export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;
