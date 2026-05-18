/**
 * Document attachments schema — the polymorphic link between a stored
 * document and any record in any module.
 *
 * A row says "document X is attached to the {entityType} record {entityId}".
 * `entityType` is a free string (e.g. "ticket", "client", "policy", "claim")
 * so a new module needs no schema change to support attachments — it just
 * passes its own type string. Tenant-scoped, RLS-isolated; deleting either the
 * document or its tenant cascades the link away.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { documents } from "./documents";

export const documentAttachments = pgTable(
  "document_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    /** The kind of record this is attached to — e.g. "ticket", "client". */
    entityType: text("entity_type").notNull(),
    /** The id of that record (always a uuid in practice, kept as text). */
    entityId: text("entity_id").notNull(),
    caption: text("caption").notNull().default(""),
    attachedByName: text("attached_by_name").notNull().default("User"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("document_attachments_tenant_idx").on(t.tenantId),
    index("document_attachments_entity_idx").on(t.entityType, t.entityId),
    index("document_attachments_document_idx").on(t.documentId),
  ],
);

export type DocumentAttachment = typeof documentAttachments.$inferSelect;
export type NewDocumentAttachment = typeof documentAttachments.$inferInsert;
