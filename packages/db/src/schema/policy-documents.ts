/**
 * Policy documents schema — ID cards, dec pages, and other policy paperwork.
 * Tenant-scoped. Distinct from the general `documents` module: these are
 * always tied to a specific policy.
 */
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
import { policies } from "./policies";

export const policyDocumentType = pgEnum("policy_document_type", [
  "id_card",
  "dec_page",
  "certificate",
  "endorsement_copy",
  "application",
  "other",
]);

export const policyDocuments = pgTable(
  "policy_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id, { onDelete: "cascade" }),
    documentType: policyDocumentType("document_type")
      .notNull()
      .default("other"),
    title: text("title").notNull(),
    /** A storage URL or external document reference number. */
    reference: text("reference").notNull().default(""),
    issuedDate: date("issued_date"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("policy_documents_tenant_idx").on(t.tenantId),
    index("policy_documents_policy_idx").on(t.policyId),
  ],
);

export type PolicyDocument = typeof policyDocuments.$inferSelect;
export type NewPolicyDocument = typeof policyDocuments.$inferInsert;
