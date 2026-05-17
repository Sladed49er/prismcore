/** Leads schema — inbound prospects before they become opportunities. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const leadStatus = pgEnum("lead_status", [
  "new",
  "working",
  "qualified",
  "converted",
  "disqualified",
]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    company: text("company").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    source: text("source").notNull().default(""),
    lineOfBusiness: text("line_of_business").notNull().default(""),
    estimatedValueCents: integer("estimated_value_cents")
      .notNull()
      .default(0),
    status: leadStatus("status").notNull().default("new"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("leads_tenant_idx").on(t.tenantId)],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
