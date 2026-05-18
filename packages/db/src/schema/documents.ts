/**
 * Documents schema — the document store. Tenant-scoped, RLS-isolated.
 *
 * A row is metadata plus, when a file has been uploaded, a pointer to the
 * file in Vercel Blob (`storageUrl` + `fileName`/`fileSizeBytes`/`mimeType`).
 * A row with no `storageUrl` is a register-only entry. `customValues` carries
 * per-tenant custom-field values for the "document" entity.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull().default("General"),
    notes: text("notes").notNull().default(""),
    /** Vercel Blob URL of the uploaded file — null for register-only rows. */
    storageUrl: text("storage_url"),
    fileName: text("file_name"),
    fileSizeBytes: integer("file_size_bytes"),
    mimeType: text("mime_type"),
    customValues: jsonb("custom_values")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("documents_tenant_idx").on(t.tenantId)],
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
