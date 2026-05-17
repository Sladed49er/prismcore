/** Producer payouts schema — commission payouts to producers. Tenant-scoped. */
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
import { producers } from "./producers";

export const producerPayoutStatus = pgEnum("producer_payout_status", [
  "scheduled",
  "paid",
]);

export const producerPayouts = pgTable(
  "producer_payouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    producerId: uuid("producer_id")
      .notNull()
      .references(() => producers.id, { onDelete: "cascade" }),
    payoutDate: date("payout_date"),
    periodLabel: text("period_label").notNull().default(""),
    amountCents: integer("amount_cents").notNull().default(0),
    method: text("method").notNull().default("check"),
    status: producerPayoutStatus("status").notNull().default("scheduled"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("producer_payouts_tenant_idx").on(t.tenantId),
    index("producer_payouts_producer_idx").on(t.producerId),
  ],
);

export type ProducerPayout = typeof producerPayouts.$inferSelect;
export type NewProducerPayout = typeof producerPayouts.$inferInsert;
