import { desc, eq } from "drizzle-orm";
import {
  adminDb,
  platformAnnouncements,
  type PlatformAnnouncement,
} from "@prismcore/db";

export type { PlatformAnnouncement };
export type AnnouncementSeverity = "info" | "warning" | "critical";
export type AnnouncementStatus = "draft" | "published";

/**
 * Platform announcements are global, not tenant-scoped — read and written
 * only through `adminDb()` behind a `requireAdmin()` guard.
 */
export async function listAnnouncements(): Promise<PlatformAnnouncement[]> {
  return adminDb()
    .select()
    .from(platformAnnouncements)
    .orderBy(desc(platformAnnouncements.createdAt));
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  severity: AnnouncementSeverity;
}): Promise<void> {
  await adminDb().insert(platformAnnouncements).values(input);
}

export async function setAnnouncementStatus(input: {
  id: string;
  status: AnnouncementStatus;
}): Promise<void> {
  await adminDb()
    .update(platformAnnouncements)
    .set({
      status: input.status,
      publishedAt: input.status === "published" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(platformAnnouncements.id, input.id));
}
