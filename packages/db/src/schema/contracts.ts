/**
 * Vendor contracts schema — the agency's own vendor agreements (software,
 * services, leases) with renewal dates and notice periods. Tenant-scoped.
 *
 * This is the agency-as-buyer side; insurance policies sold to clients live in
 * the Policies module.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const contractCategory = pgEnum("contract_category", [
  "software",
  "services",
  "lease",
  "equipment",
  "insurance",
  "other",
]);

export const contractStatus = pgEnum("contract_status", [
  "active",
  "pending",
  "expired",
  "cancelled",
]);

export const vendorContracts = pgTable(
  "vendor_contracts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    vendorName: text("vendor_name").notNull(),
    title: text("title").notNull().default(""),
    category: contractCategory("category").notNull().default("other"),
    status: contractStatus("status").notNull().default("active"),
    startDate: date("start_date"),
    /** Renewal / expiration date — drives the expiring-soon view. */
    endDate: date("end_date"),
    annualValueCents: integer("annual_value_cents").notNull().default(0),
    autoRenew: boolean("auto_renew").notNull().default(false),
    /** Days of notice required to cancel before the renewal date. */
    noticePeriodDays: integer("notice_period_days").notNull().default(0),
    ownerName: text("owner_name").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("vendor_contracts_tenant_idx").on(t.tenantId)],
);

export type VendorContract = typeof vendorContracts.$inferSelect;
export type NewVendorContract = typeof vendorContracts.$inferInsert;
