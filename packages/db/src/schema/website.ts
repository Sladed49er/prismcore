/**
 * Website schema — the agency's own website: a page inventory and a
 * change-request workflow. Tenant-scoped.
 *
 * `website_pages` is the catalog of the site's pages; `website_requests` is
 * the queue of requested changes, worked from submitted through completed.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const websitePageStatus = pgEnum("website_page_status", [
  "draft",
  "published",
  "archived",
]);

export const websitePages = pgTable(
  "website_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** The page path, e.g. "/about" or "/products/auto". */
    slug: text("slug").notNull().default(""),
    status: websitePageStatus("status").notNull().default("draft"),
    summary: text("summary").notNull().default(""),
    /** Live URL once published. */
    url: text("url").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("website_pages_tenant_idx").on(t.tenantId)],
);

export const websiteRequestType = pgEnum("website_request_type", [
  "content_update",
  "new_page",
  "design",
  "bug",
  "seo",
  "other",
]);

export const websiteRequestPriority = pgEnum("website_request_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const websiteRequestStatus = pgEnum("website_request_status", [
  "submitted",
  "in_progress",
  "in_review",
  "completed",
  "declined",
]);

export const websiteRequests = pgTable(
  "website_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    type: websiteRequestType("type").notNull().default("content_update"),
    priority: websiteRequestPriority("priority").notNull().default("normal"),
    status: websiteRequestStatus("status").notNull().default("submitted"),
    requestorName: text("requestor_name").notNull().default(""),
    /** The page or area the request concerns. */
    pageRef: text("page_ref").notNull().default(""),
    /** Outcome notes once worked. */
    resolution: text("resolution").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("website_requests_tenant_idx").on(t.tenantId)],
);

export type WebsitePage = typeof websitePages.$inferSelect;
export type NewWebsitePage = typeof websitePages.$inferInsert;
export type WebsiteRequest = typeof websiteRequests.$inferSelect;
export type NewWebsiteRequest = typeof websiteRequests.$inferInsert;
