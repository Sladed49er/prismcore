/**
 * eSign schema — a self-hosted electronic-signature ceremony.
 *
 * A request carries the agreement `body`, a field list to complete, and a
 * `publicToken` the signer opens (no login). On signing, `signedValues`,
 * `signedName`, and `signedAt` capture the completed ceremony.
 * Tenant-scoped, RLS-isolated.
 */
import { sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  date,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const esignStatus = pgEnum("esign_status", [
  "draft",
  "sent",
  "signed",
  "declined",
]);

/** One field the signer completes during the ceremony. */
export interface SignField {
  key: string;
  label: string;
  /** signature · initials · date · text */
  type: string;
  required: boolean;
}

export const signatureRequests = pgTable(
  "signature_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    documentName: text("document_name").notNull(),
    signerName: text("signer_name").notNull(),
    signerEmail: text("signer_email").notNull().default(""),
    /** The agreement text the signer reads and signs. */
    body: text("body").notNull().default(""),
    /** The unguessable token the signing page is reached by. */
    publicToken: text("public_token")
      .notNull()
      .default(sql`gen_random_uuid()`),
    fields: jsonb("fields").$type<SignField[]>().notNull().default([]),
    status: esignStatus("status").notNull().default("draft"),
    sentDate: date("sent_date"),
    /** The signer's completed field values, captured at signing. */
    signedValues: jsonb("signed_values").$type<Record<string, string>>(),
    /** The name the signer typed as their signature. */
    signedName: text("signed_name"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    declinedReason: text("declined_reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("signature_requests_tenant_idx").on(t.tenantId),
    uniqueIndex("signature_requests_token_uq").on(t.publicToken),
  ],
);

export type SignatureRequest = typeof signatureRequests.$inferSelect;
export type NewSignatureRequest = typeof signatureRequests.$inferInsert;
