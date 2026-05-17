/** Commission splits schema — a commission shared among producers. Tenant-scoped. */
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { commissions } from "./commissions";
import { producers } from "./producers";

export const commissionSplits = pgTable(
  "commission_splits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    commissionId: uuid("commission_id")
      .notNull()
      .references(() => commissions.id, { onDelete: "cascade" }),
    producerId: uuid("producer_id")
      .notNull()
      .references(() => producers.id, { onDelete: "cascade" }),
    sharePercent: text("share_percent").notNull().default(""),
    amountCents: integer("amount_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("commission_splits_tenant_idx").on(t.tenantId),
    index("commission_splits_commission_idx").on(t.commissionId),
    index("commission_splits_producer_idx").on(t.producerId),
  ],
);

export type CommissionSplit = typeof commissionSplits.$inferSelect;
export type NewCommissionSplit = typeof commissionSplits.$inferInsert;
