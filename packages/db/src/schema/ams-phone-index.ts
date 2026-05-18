/**
 * AMS phone index — a local cache of phone-number → client mappings for the
 * AMS systems that have no real-time phone-search API (HawkSoft, EZLynx).
 *
 * Stores only the minimum needed for caller matching: a normalized phone
 * number, the AMS-side client id, and a display name. A periodic sync keeps
 * it current. Tenant-scoped.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const amsPhoneIndex = pgTable(
  "ams_phone_index",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** AMS provider key — "hawksoft" or "ezlynx". */
    provider: text("provider").notNull(),
    /** Normalized phone number (E.164-ish). */
    phoneNumber: text("phone_number").notNull(),
    /** The AMS-side client / applicant id. */
    sourceId: text("source_id").notNull(),
    displayName: text("display_name").notNull().default(""),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ams_phone_index_lookup_idx").on(
      t.tenantId,
      t.provider,
      t.phoneNumber,
    ),
    unique("ams_phone_index_unique").on(
      t.tenantId,
      t.provider,
      t.phoneNumber,
      t.sourceId,
    ),
  ],
);

export type AmsPhoneIndexRow = typeof amsPhoneIndex.$inferSelect;
export type NewAmsPhoneIndexRow = typeof amsPhoneIndex.$inferInsert;
