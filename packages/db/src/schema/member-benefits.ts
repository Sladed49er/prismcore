/**
 * Member benefits schema — the catalog of partner perks, discounts, and
 * resources an association offers its members. Tenant-scoped.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const memberBenefitCategory = pgEnum("member_benefit_category", [
  "discount",
  "service",
  "resource",
  "insurance",
  "education",
  "other",
]);

export const memberBenefits = pgTable(
  "member_benefits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    partnerName: text("partner_name").notNull().default(""),
    category: memberBenefitCategory("category").notNull().default("discount"),
    description: text("description").notNull().default(""),
    /** How a member redeems the benefit — code, link, instructions. */
    redemptionDetails: text("redemption_details").notNull().default(""),
    url: text("url").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("member_benefits_tenant_idx").on(t.tenantId)],
);

export type MemberBenefit = typeof memberBenefits.$inferSelect;
export type NewMemberBenefit = typeof memberBenefits.$inferInsert;
