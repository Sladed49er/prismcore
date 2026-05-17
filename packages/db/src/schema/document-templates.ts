/** Document templates schema — reusable document templates. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const documentTemplateStatus = pgEnum("document_template_status", [
  "draft",
  "published",
  "archived",
]);

export const documentTemplates = pgTable(
  "document_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull().default("General"),
    description: text("description").notNull().default(""),
    body: text("body").notNull().default(""),
    status: documentTemplateStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("document_templates_tenant_idx").on(t.tenantId)],
);

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type NewDocumentTemplate = typeof documentTemplates.$inferInsert;
