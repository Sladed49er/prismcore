/**
 * API Clearinghouse schema.
 *
 * `clearinghouse_carriers` is a GLOBAL pool — not tenant-scoped. Every carrier or
 * MGA added to Prism joins the pool for every tenant. `tenant_carrier_connections`
 * records which carriers a given tenant has connected.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const carrierType = pgEnum("carrier_type", ["carrier", "mga"]);
export const carrierApiStatus = pgEnum("carrier_api_status", [
  "live",
  "coming_soon",
]);

export const clearinghouseCarriers = pgTable("clearinghouse_carriers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: carrierType("type").notNull().default("mga"),
  description: text("description").notNull(),
  /** Lines of business written, e.g. ["cannabis", "product liability"]. */
  lines: jsonb("lines").$type<string[]>().notNull().default([]),
  /** State codes, or ["nationwide"]. */
  states: jsonb("states").$type<string[]>().notNull().default([]),
  appetite: text("appetite").notNull().default(""),
  apiStatus: carrierApiStatus("api_status").notNull().default("live"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tenantCarrierConnections = pgTable(
  "tenant_carrier_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    carrierId: uuid("carrier_id")
      .notNull()
      .references(() => clearinghouseCarriers.id, { onDelete: "cascade" }),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tenant_carrier_tenant_idx").on(t.tenantId),
    uniqueIndex("tenant_carrier_uq").on(t.tenantId, t.carrierId),
  ],
);

export type ClearinghouseCarrier = typeof clearinghouseCarriers.$inferSelect;
export type NewClearinghouseCarrier = typeof clearinghouseCarriers.$inferInsert;
export type TenantCarrierConnection =
  typeof tenantCarrierConnections.$inferSelect;
