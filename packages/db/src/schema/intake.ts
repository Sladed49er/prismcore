/** Intake schema — prospect submissions captured by intake forms. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const intakeStatus = pgEnum("intake_status", [
  "new",
  "contacted",
  "converted",
]);

export const intakeSubmissions = pgTable(
  "intake_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    interest: text("interest").notNull().default(""),
    status: intakeStatus("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("intake_submissions_tenant_idx").on(t.tenantId)],
);

export type IntakeSubmission = typeof intakeSubmissions.$inferSelect;
export type NewIntakeSubmission = typeof intakeSubmissions.$inferInsert;
