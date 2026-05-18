/**
 * Marketing engine schema — the send side of the marketing module.
 *
 *  - `marketing_templates`   reusable email templates (subject + HTML body).
 *  - `marketing_sequences`   multi-step drip sequences; the steps are a jsonb
 *                            array of {templateId, delayDays}.
 *  - `marketing_enrollments` a client walking through a sequence — the cron
 *                            advances each one when `nextSendAt` falls due.
 *  - `marketing_sends`       a log row per email actually sent.
 *
 * Tenant-scoped, RLS-isolated.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { clients } from "./clients";

export const marketingTemplates = pgTable(
  "marketing_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subject: text("subject").notNull().default(""),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("marketing_templates_tenant_idx").on(t.tenantId)],
);

/** One step of a drip sequence — which template, and how long after the prior. */
export interface SequenceStep {
  templateId: string;
  delayDays: number;
}

export const marketingSequences = pgTable(
  "marketing_sequences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** "draft" · "active" · "archived". */
    status: text("status").notNull().default("draft"),
    steps: jsonb("steps").$type<SequenceStep[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("marketing_sequences_tenant_idx").on(t.tenantId)],
);

export const marketingEnrollments = pgTable(
  "marketing_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => marketingSequences.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** "active" · "completed" · "cancelled". */
    status: text("status").notNull().default("active"),
    /** Index of the next step to send. */
    currentStep: integer("current_step").notNull().default(0),
    /** When the next step is due. */
    nextSendAt: timestamp("next_send_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("marketing_enrollments_tenant_idx").on(t.tenantId),
    index("marketing_enrollments_sequence_idx").on(t.sequenceId),
  ],
);

export const marketingSends = pgTable(
  "marketing_sends",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull().default(""),
    /** "campaign" · "sequence". */
    source: text("source").notNull(),
    /** The campaign or sequence this send came from. */
    sourceId: uuid("source_id"),
    /** "sent" · "failed". */
    status: text("status").notNull().default("sent"),
    sentAt: timestamp("sent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("marketing_sends_tenant_idx").on(t.tenantId)],
);

export type MarketingTemplate = typeof marketingTemplates.$inferSelect;
export type MarketingSequence = typeof marketingSequences.$inferSelect;
export type MarketingEnrollment = typeof marketingEnrollments.$inferSelect;
export type MarketingSend = typeof marketingSends.$inferSelect;
