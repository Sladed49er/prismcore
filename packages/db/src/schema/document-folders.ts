/** Document folders schema — the category list for the document library. Tenant-scoped. */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const documentFolders = pgTable(
  "document_folders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("document_folders_tenant_idx").on(t.tenantId)],
);

export type DocumentFolder = typeof documentFolders.$inferSelect;
export type NewDocumentFolder = typeof documentFolders.$inferInsert;
