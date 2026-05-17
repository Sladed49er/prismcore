/** Claim diary schema — chronological notes on a claim. Tenant-scoped. */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { claims } from "./claims";

export const claimNoteCategory = pgEnum("claim_note_category", [
  "diary",
  "contact",
  "coverage",
  "investigation",
  "other",
]);

export const claimNotes = pgTable(
  "claim_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    noteDate: date("note_date"),
    author: text("author").notNull().default(""),
    category: claimNoteCategory("category").notNull().default("diary"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("claim_notes_tenant_idx").on(t.tenantId),
    index("claim_notes_claim_idx").on(t.claimId),
  ],
);

export type ClaimNote = typeof claimNotes.$inferSelect;
export type NewClaimNote = typeof claimNotes.$inferInsert;
