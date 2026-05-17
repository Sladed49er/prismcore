/**
 * Accounts Payable schema — vendors and the bills owed to them. Tenant-scoped,
 * RLS-isolated. A bill tracks amount vs. amount paid; status follows from that.
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

export const vendorType = pgEnum("vendor_type", [
  "carrier",
  "supplier",
  "service",
  "other",
]);

export const billStatus = pgEnum("bill_status", [
  "pending",
  "partial",
  "paid",
  "void",
]);

export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: vendorType("type").notNull().default("supplier"),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    paymentTerms: text("payment_terms").notNull().default("Net 30"),
    is1099: boolean("is_1099").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("vendors_tenant_idx").on(t.tenantId)],
);

export const bills = pgTable(
  "bills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    billNumber: text("bill_number").notNull(),
    billDate: date("bill_date"),
    dueDate: date("due_date"),
    amountCents: integer("amount_cents").notNull().default(0),
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),
    status: billStatus("status").notNull().default("pending"),
    memo: text("memo").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("bills_tenant_idx").on(t.tenantId),
    index("bills_vendor_idx").on(t.vendorId),
  ],
);

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
