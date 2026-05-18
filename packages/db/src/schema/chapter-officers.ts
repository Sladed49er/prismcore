/**
 * Chapter officers schema — the elected/appointed leaders of a chapter.
 * Tenant-scoped.
 */
import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./kernel";
import { chapters } from "./chapters";

export const chapterOfficers = pgTable(
  "chapter_officers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Officer role — President, VP, Secretary, Treasurer, etc. */
    role: text("role").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    termEnd: date("term_end"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("chapter_officers_tenant_idx").on(t.tenantId),
    index("chapter_officers_chapter_idx").on(t.chapterId),
  ],
);

export type ChapterOfficer = typeof chapterOfficers.$inferSelect;
export type NewChapterOfficer = typeof chapterOfficers.$inferInsert;
