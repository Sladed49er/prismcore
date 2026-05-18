/**
 * Memberships schema — the member directory for a professional association:
 * one row per member, with tier, dues, and renewal tracking. Tenant-scoped.
 */
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

export const membershipTier = pgEnum("membership_tier", [
  "individual",
  "professional",
  "corporate",
  "student",
  "lifetime",
]);

export const membershipStatus = pgEnum("membership_status", [
  "active",
  "pending",
  "lapsed",
  "cancelled",
]);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    memberName: text("member_name").notNull(),
    organization: text("organization").notNull().default(""),
    tier: membershipTier("tier").notNull().default("individual"),
    status: membershipStatus("status").notNull().default("pending"),
    joinDate: date("join_date"),
    renewalDate: date("renewal_date"),
    duesCents: integer("dues_cents").notNull().default(0),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("memberships_tenant_idx").on(t.tenantId)],
);

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
