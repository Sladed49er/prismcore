/** Certificate templates schema — reusable COI templates. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const certificateTemplateStatus = pgEnum(
  "certificate_template_status",
  ["draft", "published", "archived"],
);

export const certificateTemplates = pgTable(
  "certificate_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    coverageSummary: text("coverage_summary").notNull().default(""),
    status: certificateTemplateStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("certificate_templates_tenant_idx").on(t.tenantId)],
);

export type CertificateTemplate = typeof certificateTemplates.$inferSelect;
export type NewCertificateTemplate =
  typeof certificateTemplates.$inferInsert;
