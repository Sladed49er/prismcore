/**
 * Client portal schema — insured-facing self-service access.
 *
 * Each row grants one client read-only access to their own policy summary
 * through a unique, revocable access token (a magic-link-style URL). No
 * password; the token is the credential. Tenant-scoped.
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
import { clients } from "./clients";

export const portalInvitationStatus = pgEnum("portal_invitation_status", [
  "invited", // link created, not yet opened
  "active", // the insured has opened it
  "revoked", // access withdrawn
]);

export const portalInvitations = pgTable(
  "portal_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** The access credential carried in the portal URL — long and random. */
    token: text("token").notNull().unique(),
    email: text("email").notNull().default(""),
    status: portalInvitationStatus("status").notNull().default("invited"),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("portal_invitations_tenant_idx").on(t.tenantId)],
);

export type PortalInvitation = typeof portalInvitations.$inferSelect;
export type NewPortalInvitation = typeof portalInvitations.$inferInsert;
