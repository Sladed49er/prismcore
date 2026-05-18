/**
 * Document analyses schema — the output of Prism Core's document
 * intelligence: a coverage review of one document, a comparison of two (e.g.
 * an expiring policy against its renewal), or a cross-policy audit of every
 * document on a client.
 *
 * The model reads the actual files (Claude reads PDFs and images natively)
 * and returns a structured set of findings; trusted code validates and
 * stores them here. Tenant-scoped, RLS-isolated.
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
import { documents } from "./documents";
import { clients } from "./clients";

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
    /**
     * "review" — one document · "compare" — document vs compareDocument ·
     * "audit" — every document on a client, checked together.
     */
    kind: text("kind").notNull(),
    /** The document under review/comparison; null for a client audit. */
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "cascade",
    }),
    /** The second document for a comparison; null otherwise. */
    compareDocumentId: uuid("compare_document_id").references(
      () => documents.id,
      { onDelete: "set null" },
    ),
    /** The client a cross-policy audit is about; null otherwise. */
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),
    status: text("status").notNull().default("pending"),
    title: text("title").notNull().default(""),
    summary: text("summary").notNull().default(""),
    /** A 0-100 coverage-health score on a single-document review. */
    score: integer("score"),
    /** Structured fields the model extracted from the document. */
    extractedData: jsonb("extracted_data").$type<Record<string, string>>(),
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
