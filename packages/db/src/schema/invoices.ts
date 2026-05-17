/** Invoices schema — the Accounting module's billing register. Tenant-scoped. */
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
import { clients } from "./clients";

export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "void",
]);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    description: text("description").notNull().default(""),
    amountCents: integer("amount_cents").notNull().default(0),
    status: invoiceStatus("status").notNull().default("draft"),
    dueDate: date("due_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("invoices_tenant_idx").on(t.tenantId),
    index("invoices_client_idx").on(t.clientId),
  ],
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
