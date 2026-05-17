/** eSign schema — electronic-signature requests. Tenant-scoped, RLS-isolated. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const esignStatus = pgEnum("esign_status", [
  "draft",
  "sent",
  "signed",
  "declined",
]);

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
    status: esignStatus("status").notNull().default("draft"),
    sentDate: date("sent_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("signature_requests_tenant_idx").on(t.tenantId)],
);

export type SignatureRequest = typeof signatureRequests.$inferSelect;
export type NewSignatureRequest = typeof signatureRequests.$inferInsert;
