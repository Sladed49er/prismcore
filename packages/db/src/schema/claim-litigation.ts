/** Claim litigation schema — suits arising from a claim. Tenant-scoped. */
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
import { claims } from "./claims";

export const litigationStatus = pgEnum("claim_litigation_status", [
  "pre_suit",
  "filed",
  "discovery",
  "trial",
  "settled",
  "dismissed",
  "closed",
]);

export const claimLitigation = pgTable(
  "claim_litigation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    caseCaption: text("case_caption").notNull(),
    court: text("court").notNull().default(""),
    docketNumber: text("docket_number").notNull().default(""),
    defenseAttorney: text("defense_attorney").notNull().default(""),
    filedDate: date("filed_date"),
    trialDate: date("trial_date"),
    status: litigationStatus("status").notNull().default("pre_suit"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("claim_litigation_tenant_idx").on(t.tenantId),
    index("claim_litigation_claim_idx").on(t.claimId),
  ],
);

export type ClaimLitigation = typeof claimLitigation.$inferSelect;
export type NewClaimLitigation = typeof claimLitigation.$inferInsert;
