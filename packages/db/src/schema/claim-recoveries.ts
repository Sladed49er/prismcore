/** Claim recoveries schema — subrogation, salvage, and deductible recovery. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { claims } from "./claims";

export const recoveryType = pgEnum("claim_recovery_type", [
  "subrogation",
  "salvage",
  "deductible",
  "other",
]);

export const recoveryStatus = pgEnum("claim_recovery_status", [
  "pursuing",
  "recovered",
  "closed",
  "abandoned",
]);

export const claimRecoveries = pgTable(
  "claim_recoveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    recoveryType: recoveryType("recovery_type")
      .notNull()
      .default("subrogation"),
    description: text("description").notNull().default(""),
    expectedCents: integer("expected_cents").notNull().default(0),
    recoveredCents: integer("recovered_cents").notNull().default(0),
    status: recoveryStatus("status").notNull().default("pursuing"),
    recoveryDate: date("recovery_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("claim_recoveries_tenant_idx").on(t.tenantId),
    index("claim_recoveries_claim_idx").on(t.claimId),
  ],
);

export type ClaimRecovery = typeof claimRecoveries.$inferSelect;
export type NewClaimRecovery = typeof claimRecoveries.$inferInsert;
