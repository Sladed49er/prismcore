/** Marketing campaigns schema — outbound marketing efforts. Tenant-scoped. */
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

export const campaignStatus = pgEnum("campaign_status", [
  "planned",
  "active",
  "completed",
  "cancelled",
]);

export const marketingCampaigns = pgTable(
  "marketing_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    channel: text("channel").notNull().default(""),
    startDate: date("start_date"),
    endDate: date("end_date"),
    budgetCents: integer("budget_cents").notNull().default(0),
    status: campaignStatus("status").notNull().default("planned"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("marketing_campaigns_tenant_idx").on(t.tenantId)],
);

export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type NewMarketingCampaign = typeof marketingCampaigns.$inferInsert;
