/**
 * Website request comments schema — the activity thread on a website change
 * request: progress notes, questions, and updates. Tenant-scoped.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { websiteRequests } from "./website";

export const websiteRequestComments = pgTable(
  "website_request_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    requestId: uuid("request_id")
      .notNull()
      .references(() => websiteRequests.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull().default(""),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("website_request_comments_tenant_idx").on(t.tenantId),
    index("website_request_comments_request_idx").on(t.requestId),
  ],
);

export type WebsiteRequestComment =
  typeof websiteRequestComments.$inferSelect;
export type NewWebsiteRequestComment =
  typeof websiteRequestComments.$inferInsert;
