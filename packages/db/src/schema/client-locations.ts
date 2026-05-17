/** Client locations schema — addresses on a client account. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { clients } from "./clients";

export const clientLocationType = pgEnum("client_location_type", [
  "mailing",
  "physical",
  "billing",
  "branch",
]);

export const clientLocations = pgTable(
  "client_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    label: text("label").notNull().default(""),
    locationType: clientLocationType("location_type")
      .notNull()
      .default("physical"),
    addressLine: text("address_line").notNull().default(""),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default(""),
    postalCode: text("postal_code").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("client_locations_tenant_idx").on(t.tenantId),
    index("client_locations_client_idx").on(t.clientId),
  ],
);

export type ClientLocation = typeof clientLocations.$inferSelect;
export type NewClientLocation = typeof clientLocations.$inferInsert;
