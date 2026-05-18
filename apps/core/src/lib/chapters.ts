import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  chapters,
  chapterOfficers,
  type Chapter,
  type ChapterOfficer,
} from "@prismcore/db";

/**
 * Chapters data layer — association chapters and their officers.
 * RLS-scoped through `withTenantContext`.
 */

export type { Chapter, ChapterOfficer };

export type ChapterType = "geographic" | "functional" | "student";
export type ChapterStatus = "active" | "forming" | "inactive";

export async function listChapters(tenantId: string): Promise<Chapter[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(chapters)
      .where(eq(chapters.tenantId, tenantId))
      .orderBy(desc(chapters.memberCount)),
  );
}

export async function createChapter(input: {
  tenantId: string;
  name: string;
  type: ChapterType;
  region: string;
  leaderName: string;
  memberCount: number;
  status: ChapterStatus;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(chapters).values(input);
  });
}

export async function updateChapter(input: {
  tenantId: string;
  id: string;
  name: string;
  type: ChapterType;
  region: string;
  leaderName: string;
  memberCount: number;
  status: ChapterStatus;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(chapters)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(chapters.id, id));
  });
}

export async function setChapterStatus(input: {
  tenantId: string;
  id: string;
  status: ChapterStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(chapters)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(chapters.id, input.id));
  });
}

export async function deleteChapter(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(chapters).where(eq(chapters.id, id));
  });
}

/* ── Officers ─────────────────────────────────────────────────────── */

export interface ChapterOfficerRow extends ChapterOfficer {
  chapterName: string;
}

export async function listChapterOfficers(
  tenantId: string,
): Promise<ChapterOfficerRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ officer: chapterOfficers, chapter: chapters })
      .from(chapterOfficers)
      .leftJoin(chapters, eq(chapterOfficers.chapterId, chapters.id))
      .where(eq(chapterOfficers.tenantId, tenantId))
      .orderBy(desc(chapterOfficers.createdAt));
    return rows.map((r) => ({
      ...r.officer,
      chapterName: r.chapter?.name ?? "—",
    }));
  });
}

export async function createChapterOfficer(input: {
  tenantId: string;
  chapterId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  termEnd: string | null;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(chapterOfficers).values(input);
  });
}

export async function deleteChapterOfficer(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(chapterOfficers).where(eq(chapterOfficers.id, id));
  });
}
