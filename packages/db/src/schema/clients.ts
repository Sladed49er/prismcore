/**
 * Clients schema — the CRM record at the center of the platform. Tenant-scoped;
 * RLS-isolated like every other tenant table.
 *
 * `customValues` holds the per-tenant custom-field values (keyed by field_key),
 * so the customization engine writes straight onto the client record.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const clientType = pgEnum("client_type", ["person", "business"]);
export const clientStatus = pgEnum("client_status", [
  "prospect",
  "active",
  "inactive",
]);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: clientType("type").notNull().default("person"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    businessName: text("business_name"),
    email: text("email"),
    phone: text("phone"),
    city: text("city"),
    state: text("state"),
    status: clientStatus("status").notNull().default("prospect"),
    /** Values for the tenant's custom fields, keyed by field_key. */
    customValues: jsonb("custom_values")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("clients_tenant_idx").on(t.tenantId)],
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
