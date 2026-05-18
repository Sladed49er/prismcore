/**
 * Benefit redemptions schema — a record each time a member uses a member
 * benefit. Tenant-scoped.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { memberBenefits } from "./member-benefits";

export const benefitRedemptions = pgTable(
  "benefit_redemptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    benefitId: uuid("benefit_id")
      .notNull()
      .references(() => memberBenefits.id, { onDelete: "cascade" }),
    memberName: text("member_name").notNull(),
    redeemedOn: date("redeemed_on"),
    /** Estimated value or savings to the member, in cents. */
    estimatedValueCents: integer("estimated_value_cents")
      .notNull()
      .default(0),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("benefit_redemptions_tenant_idx").on(t.tenantId),
    index("benefit_redemptions_benefit_idx").on(t.benefitId),
  ],
);

export type BenefitRedemption = typeof benefitRedemptions.$inferSelect;
export type NewBenefitRedemption = typeof benefitRedemptions.$inferInsert;
