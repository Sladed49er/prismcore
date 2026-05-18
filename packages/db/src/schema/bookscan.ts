/**
 * BookScan schema — saved AI book-of-business analyses.
 *
 * Each row is one analysis run: a snapshot of the book's size, a computed
 * composition breakdown (by line and carrier), an AI narrative summary, and a
 * list of structured findings. Tenant-scoped.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

/** One structured insight from a BookScan run. */
export interface BookScanFinding {
  category: string;
  title: string;
  detail: string;
  sentiment: "positive" | "watch" | "risk";
}

/** The deterministic composition snapshot stored alongside the AI narrative. */
export interface BookScanComposition {
  byLine: { label: string; policies: number; premiumCents: number }[];
  byCarrier: { label: string; policies: number; premiumCents: number }[];
  byStatus: { label: string; policies: number }[];
  activePolicies: number;
}

export const bookscanReports = pgTable(
  "bookscan_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    generatedBy: text("generated_by").notNull().default(""),
    totalClients: integer("total_clients").notNull().default(0),
    totalPolicies: integer("total_policies").notNull().default(0),
    totalPremiumCents: bigint("total_premium_cents", { mode: "number" })
      .notNull()
      .default(0),
    summary: text("summary").notNull().default(""),
    findings: jsonb("findings")
      .$type<BookScanFinding[]>()
      .notNull()
      .default([]),
    composition: jsonb("composition").$type<BookScanComposition>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("bookscan_reports_tenant_idx").on(t.tenantId)],
);

export type BookScanReport = typeof bookscanReports.$inferSelect;
export type NewBookScanReport = typeof bookscanReports.$inferInsert;
