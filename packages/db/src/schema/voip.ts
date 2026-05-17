/**
 * PrismVoice schema — the call-center module (the rebuilt CallIntel).
 *
 * `tenant_voip_connections` records which phone systems a tenant has connected;
 * `tenant_ams_connections` records the agency-management system the calls
 * write back into (AMS360, etc.); `calls` is the tenant-scoped call log that
 * the provider webhooks, screen pop, and AI summaries all write to.
 */
import { sql } from "drizzle-orm";
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
  "in_progress",
  "completed",
  "missed",
  "voicemail",
]);

export const tenantVoipConnections = pgTable(
  "tenant_voip_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** VoIP provider id, e.g. "zoom", "ringcentral", "dialpad". */
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

/**
 * The agency-management system a tenant syncs calls into. One per tenant.
 * `config` holds the connection: endpoint/AgencyNo, username, encrypted
 * password, employeeCode, webTenantId (AMS360 web portal id), and the
 * autoSync / screenPop toggles.
 */
export const tenantAmsConnections = pgTable(
  "tenant_ams_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** AMS provider id, e.g. "ams360". */
    provider: text("provider").notNull(),
    config: jsonb("config")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("tenant_ams_uq").on(t.tenantId)],
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
    /** The agency's own number (inbound) or the dialed number (outbound). */
    toNumber: text("to_number"),
    /** Screen-pop result — the matched contact name, or null if unmatched. */
    contactName: text("contact_name"),
    status: callStatus("status").notNull().default("completed"),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    aiSummary: text("ai_summary"),
    disposition: text("disposition"),
    provider: text("provider").notNull().default("manual"),
    /** Provider-native call id (e.g. Dialpad call_id) — the dedup key. */
    providerCallId: text("provider_call_id"),
    /** Dialpad master_call_id, set on child legs of a multi-leg call. */
    masterCallId: text("master_call_id"),
    /** The agent who handled the call, from the provider. */
    agentName: text("agent_name"),
    agentEmail: text("agent_email"),
    /** AMS contact this call was matched + screen-popped to. */
    matchedContactId: text("matched_contact_id"),
    matchedContactName: text("matched_contact_name"),
    /** Call recording + transcript, when the provider supplies them. */
    recordingUrl: text("recording_url"),
    transcript: text("transcript"),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("calls_tenant_idx").on(t.tenantId),
    // One row per provider call id, per tenant — the webhook upsert target.
    uniqueIndex("calls_provider_call_uq")
      .on(t.tenantId, t.providerCallId)
      .where(sql`${t.providerCallId} is not null`),
  ],
);

export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type TenantVoipConnection = typeof tenantVoipConnections.$inferSelect;
export type TenantAmsConnection = typeof tenantAmsConnections.$inferSelect;
