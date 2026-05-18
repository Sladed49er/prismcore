import { desc, eq } from "drizzle-orm";
import { withTenantContext, chapters, type Chapter } from "@prismcore/db";

/**
 * Chapters data layer — association chapters.
 * RLS-scoped through `withTenantContext`.
 */

export type { Chapter };

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
