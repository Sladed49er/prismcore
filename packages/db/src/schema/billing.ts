/**
 * Billing schema — one row per tenant tracking its Stripe subscription.
 *
 * Prism Core bills each agency directly through Stripe: a base plan plus
 * add-on modules. This table is the local mirror of Stripe's state, kept in
 * sync by the Stripe webhook. `past_due_since` drives the dunning ladder
 * (internal alert → 15-day notice → 30-day suspension).
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";

export const billingStatus = pgEnum("billing_status", [
  "none", // no subscription yet
  "trialing",
  "active",
  "past_due", // a payment failed — dunning clock running
  "canceled",
  "suspended", // Prism Core locked the tenant out (30 days past due)
]);

export const tenantBilling = pgTable("tenant_billing", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: billingStatus("status").notNull().default("none"),
  /** The base plan key the tenant is on (industry-scoped, e.g. "insurance"). */
  planKey: text("plan_key"),
  /** End of the current paid period — from Stripe. */
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  /** When the subscription first went past_due — the dunning clock starts. */
  pastDueSince: timestamp("past_due_since", { withTimezone: true }),
  /** Dunning ladder progress: 0 none · 1 internal alert sent · 2 15-day
   *  notice sent · 3 suspended. Reset to 0 when payment recovers. */
  dunningStage: integer("dunning_stage").notNull().default(0),
  /** When Prism Core suspended the tenant for non-payment. */
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TenantBilling = typeof tenantBilling.$inferSelect;
export type NewTenantBilling = typeof tenantBilling.$inferInsert;
