/**
 * Platform announcements schema — broadcasts from the Prism team to every
 * tenant (maintenance notices, 0-day patch advisories, release notes).
 *
 * This is a PLATFORM-GLOBAL table, like `tenants`: it carries no `tenant_id`
 * and is intentionally excluded from RLS. It is only ever read or written
 * through `adminDb()` behind a `requireAdmin()` guard.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const announcementSeverity = pgEnum("announcement_severity", [
  "info",
  "warning",
  "critical",
]);

export const announcementStatus = pgEnum("announcement_status", [
  "draft",
  "published",
]);

export const platformAnnouncements = pgTable("platform_announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  severity: announcementSeverity("severity").notNull().default("info"),
  status: announcementStatus("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PlatformAnnouncement =
  typeof platformAnnouncements.$inferSelect;
export type NewPlatformAnnouncement =
  typeof platformAnnouncements.$inferInsert;
