/** Certificate holders schema — the parties that require COIs. Tenant-scoped. */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const certificateHolders = pgTable(
  "certificate_holders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address").notNull().default(""),
    contactName: text("contact_name").notNull().default(""),
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
  (t) => [index("certificate_holders_tenant_idx").on(t.tenantId)],
);

export type CertificateHolder = typeof certificateHolders.$inferSelect;
export type NewCertificateHolder = typeof certificateHolders.$inferInsert;
