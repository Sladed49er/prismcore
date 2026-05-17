/**
 * PrismVoice schema — the call-center module (the rebuilt CallIntel).
 *
 * `tenant_voip_connections` records which phone systems a tenant has connected;
 * `calls` is the tenant-scoped call log that screen pop and AI summaries write to.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const callDirection = pgEnum("call_direction", ["inbound", "outbound"]);
export const callStatus = pgEnum("call_status", [
  "ringing",
  "completed",
  "missed",
]);

export const tenantVoipConnections = pgTable(
  "tenant_voip_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** VoIP provider id, e.g. "zoom", "ringcentral". */
    providerId: text("provider_id").notNull(),
    config: jsonb("config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tenant_voip_tenant_idx").on(t.tenantId),
    uniqueIndex("tenant_voip_uq").on(t.tenantId, t.providerId),
  ],
);

export const calls = pgTable(
  "calls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    direction: callDirection("direction").notNull().default("inbound"),
    fromNumber: text("from_number").notNull(),
    /** Screen-pop result — the matched contact name, or null if unmatched. */
    contactName: text("contact_name"),
    status: callStatus("status").notNull().default("completed"),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    aiSummary: text("ai_summary"),
    disposition: text("disposition"),
    provider: text("provider").notNull().default("manual"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("calls_tenant_idx").on(t.tenantId)],
);

export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type TenantVoipConnection = typeof tenantVoipConnections.$inferSelect;
