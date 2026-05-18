/**
 * Cross-sell schema — recommended lines of business an existing client does
 * not yet hold. Rows are either AI-generated (book analysis) or hand-added by
 * a producer, then worked from suggested through won. Tenant-scoped.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { clients } from "./clients";

export const crossSellStatus = pgEnum("cross_sell_status", [
  "suggested",
  "pursuing",
  "quoted",
  "won",
  "dismissed",
]);

export const crossSellConfidence = pgEnum("cross_sell_confidence", [
  "low",
  "medium",
  "high",
]);

export const crossSellSource = pgEnum("cross_sell_source", ["ai", "manual"]);

export const crossSellOpportunities = pgTable(
  "cross_sell_opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** Client name snapshot — display without a join. */
    clientName: text("client_name").notNull().default(""),
    /** Recommended line of business, e.g. "Umbrella", "Flood". */
    line: text("line").notNull(),
    rationale: text("rationale").notNull().default(""),
    estimatedPremiumCents: integer("estimated_premium_cents")
      .notNull()
      .default(0),
    confidence: crossSellConfidence("confidence").notNull().default("medium"),
    status: crossSellStatus("status").notNull().default("suggested"),
    source: crossSellSource("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("cross_sell_opportunities_tenant_idx").on(t.tenantId)],
);

export type CrossSellOpportunity =
  typeof crossSellOpportunities.$inferSelect;
export type NewCrossSellOpportunity =
  typeof crossSellOpportunities.$inferInsert;
