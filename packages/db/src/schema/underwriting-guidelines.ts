/** Underwriting guidelines schema — appetite and guideline notes per carrier. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { carriers } from "./carriers";

export const underwritingGuidelineStatus = pgEnum(
  "underwriting_guideline_status",
  ["current", "under_review", "retired"],
);

export const underwritingGuidelines = pgTable(
  "underwriting_guidelines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    carrierId: uuid("carrier_id")
      .notNull()
      .references(() => carriers.id, { onDelete: "cascade" }),
    lineOfBusiness: text("line_of_business").notNull().default(""),
    title: text("title").notNull(),
    guidelines: text("guidelines").notNull().default(""),
    status: underwritingGuidelineStatus("status")
      .notNull()
      .default("current"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("underwriting_guidelines_tenant_idx").on(t.tenantId),
    index("underwriting_guidelines_carrier_idx").on(t.carrierId),
  ],
);

export type UnderwritingGuideline =
  typeof underwritingGuidelines.$inferSelect;
export type NewUnderwritingGuideline =
  typeof underwritingGuidelines.$inferInsert;
