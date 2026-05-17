/** Document shares schema — shareable links to a document. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { documents } from "./documents";

export const documentShareStatus = pgEnum("document_share_status", [
  "active",
  "expired",
  "revoked",
]);

export const documentShares = pgTable(
  "document_shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    label: text("label").notNull().default(""),
    recipient: text("recipient").notNull().default(""),
    expiresDate: date("expires_date"),
    status: documentShareStatus("status").notNull().default("active"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("document_shares_tenant_idx").on(t.tenantId),
    index("document_shares_document_idx").on(t.documentId),
  ],
);

export type DocumentShare = typeof documentShares.$inferSelect;
export type NewDocumentShare = typeof documentShares.$inferInsert;
