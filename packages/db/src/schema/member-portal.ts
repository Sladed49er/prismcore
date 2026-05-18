/**
 * Member portal schema — member-facing self-service access.
 *
 * Each row grants one association member a unique, revocable access token
 * (a magic-link-style URL) to view their membership, benefits, and events.
 * No password; the token is the credential. Tenant-scoped.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { memberships } from "./memberships";

export const memberPortalStatus = pgEnum("member_portal_status", [
  "invited",
  "active",
  "revoked",
]);

export const memberPortalInvitations = pgTable(
  "member_portal_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    /** Member name snapshot — display without a join. */
    memberName: text("member_name").notNull().default(""),
    /** The access credential carried in the portal URL — long and random. */
    token: text("token").notNull().unique(),
    email: text("email").notNull().default(""),
    status: memberPortalStatus("status").notNull().default("invited"),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("member_portal_invitations_tenant_idx").on(t.tenantId)],
);

export type MemberPortalInvitation =
  typeof memberPortalInvitations.$inferSelect;
export type NewMemberPortalInvitation =
  typeof memberPortalInvitations.$inferInsert;
