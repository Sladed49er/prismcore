/** Opportunities schema — the Pipeline module. Tenant-scoped, RLS-isolated. */
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
import { clients } from "./clients";

export const pipelineStage = pgEnum("pipeline_stage", [
  "new",
  "contacted",
  "quoted",
  "won",
  "lost",
]);

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    stage: pipelineStage("stage").notNull().default("new"),
    valueCents: integer("value_cents").notNull().default(0),
    notes: text("notes").notNull().default(""),
    expectedCloseDate: date("expected_close_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("opportunities_tenant_idx").on(t.tenantId),
    index("opportunities_client_idx").on(t.clientId),
  ],
);

export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
