/**
 * Household members schema — the individual people who make up a
 * wealth-management household. Tenant-scoped.
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { households } from "./households";

export const householdMembers = pgTable(
  "household_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Relationship to the household, e.g. "spouse", "child", "trustee". */
    relationship: text("relationship").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    dateOfBirth: date("date_of_birth"),
    /** Whether this member is the household's primary contact. */
    isPrimary: boolean("is_primary").notNull().default(false),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("household_members_tenant_idx").on(t.tenantId),
    index("household_members_household_idx").on(t.householdId),
  ],
);

export type HouseholdMember = typeof householdMembers.$inferSelect;
export type NewHouseholdMember = typeof householdMembers.$inferInsert;
