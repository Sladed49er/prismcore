/** Carrier contacts schema — the people at a carrier. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { carriers } from "./carriers";

export const carrierContactRole = pgEnum("carrier_contact_role", [
  "underwriter",
  "marketing",
  "claims",
  "billing",
  "other",
]);

export const carrierContacts = pgTable(
  "carrier_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    carrierId: uuid("carrier_id")
      .notNull()
      .references(() => carriers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    title: text("title").notNull().default(""),
    role: carrierContactRole("role").notNull().default("underwriter"),
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
  (t) => [
    index("carrier_contacts_tenant_idx").on(t.tenantId),
    index("carrier_contacts_carrier_idx").on(t.carrierId),
  ],
);

export type CarrierContact = typeof carrierContacts.$inferSelect;
export type NewCarrierContact = typeof carrierContacts.$inferInsert;
