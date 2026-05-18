/**
 * Document analyses schema — the output of Prism Core's document
 * intelligence: an AI coverage review of one document, or a comparison of
 * two (e.g. an expiring policy against its renewal).
 *
 * The model reads the actual files (Claude reads PDFs and images natively)
 * and returns a structured set of findings; trusted code validates and
 * stores them here. Tenant-scoped, RLS-isolated.
 */
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { documents } from "./documents";

/** One structured finding from an analysis. */
export interface DocFinding {
  category: string;
  title: string;
  detail: string;
  /** info — neutral note · watch — worth attention · gap — a coverage gap. */
  severity: "info" | "watch" | "gap";
}

export const documentAnalyses = pgTable(
  "document_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** "review" — one document · "compare" — document vs compareDocument. */
    kind: text("kind").notNull(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    /** The second document for a comparison; null for a review. */
    compareDocumentId: uuid("compare_document_id").references(
      () => documents.id,
      { onDelete: "set null" },
    ),
    status: text("status").notNull().default("pending"),
    title: text("title").notNull().default(""),
    summary: text("summary").notNull().default(""),
    findings: jsonb("findings")
      .$type<DocFinding[]>()
      .notNull()
      .default([]),
    errorMessage: text("error_message").notNull().default(""),
    generatedBy: text("generated_by").notNull().default("User"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("document_analyses_tenant_idx").on(t.tenantId),
    index("document_analyses_document_idx").on(t.documentId),
  ],
);

export type DocumentAnalysis = typeof documentAnalyses.$inferSelect;
export type NewDocumentAnalysis = typeof documentAnalyses.$inferInsert;
