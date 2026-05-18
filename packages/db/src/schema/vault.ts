/**
 * Password Vault schema — shared credentials an agency keeps for carrier
 * portals, banking, and software logins. Tenant-scoped.
 *
 * The `secret` column holds the password encrypted at rest (AES-256-GCM via
 * `lib/crypto`); it is never sent to the browser in list views — the reveal
 * action decrypts a single entry on demand.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const vaultCategory = pgEnum("vault_category", [
  "carrier",
  "banking",
  "software",
  "system",
  "other",
]);

export const vaultCredentials = pgTable(
  "vault_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: vaultCategory("category").notNull().default("other"),
    url: text("url").notNull().default(""),
    username: text("username").notNull().default(""),
    /** AES-256-GCM ciphertext — never returned to the client in list views. */
    secret: text("secret").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("vault_credentials_tenant_idx").on(t.tenantId)],
);

export type VaultCredential = typeof vaultCredentials.$inferSelect;
export type NewVaultCredential = typeof vaultCredentials.$inferInsert;
