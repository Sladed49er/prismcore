/** Check register schema — checks written, tracked, and cleared. Tenant-scoped. */
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

export const checkStatus = pgEnum("check_status", [
  "printed",
  "cleared",
  "voided",
]);

export const checkRegister = pgTable(
  "check_register",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    checkNumber: text("check_number").notNull(),
    payee: text("payee").notNull(),
    amountCents: integer("amount_cents").notNull().default(0),
    checkDate: date("check_date"),
    memo: text("memo").notNull().default(""),
    status: checkStatus("status").notNull().default("printed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("check_register_tenant_idx").on(t.tenantId)],
);

export type Check = typeof checkRegister.$inferSelect;
export type NewCheck = typeof checkRegister.$inferInsert;
