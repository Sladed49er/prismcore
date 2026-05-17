/** Claim payments schema — payments issued on a claim. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { claims } from "./claims";

export const claimPaymentType = pgEnum("claim_payment_type", [
  "indemnity",
  "expense",
  "legal",
  "medical",
]);

export const claimPaymentStatus = pgEnum("claim_payment_status", [
  "pending",
  "issued",
  "cleared",
  "voided",
]);

export const claimPayments = pgTable(
  "claim_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    paymentDate: date("payment_date"),
    payee: text("payee").notNull(),
    paymentType: claimPaymentType("payment_type")
      .notNull()
      .default("indemnity"),
    amountCents: integer("amount_cents").notNull().default(0),
    checkNumber: text("check_number").notNull().default(""),
    status: claimPaymentStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("claim_payments_tenant_idx").on(t.tenantId),
    index("claim_payments_claim_idx").on(t.claimId),
  ],
);

export type ClaimPayment = typeof claimPayments.$inferSelect;
export type NewClaimPayment = typeof claimPayments.$inferInsert;
