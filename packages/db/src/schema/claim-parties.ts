/** Claim parties schema — the people and firms involved in a claim. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { claims } from "./claims";

export const claimPartyRole = pgEnum("claim_party_role", [
  "claimant",
  "insured",
  "witness",
  "adjuster",
  "attorney",
  "third_party",
  "expert",
  "other",
]);

export const claimParties = pgTable(
  "claim_parties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    role: claimPartyRole("role").notNull().default("claimant"),
    name: text("name").notNull(),
    organization: text("organization").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("claim_parties_tenant_idx").on(t.tenantId),
    index("claim_parties_claim_idx").on(t.claimId),
  ],
);

export type ClaimParty = typeof claimParties.$inferSelect;
export type NewClaimParty = typeof claimParties.$inferInsert;
