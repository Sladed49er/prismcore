"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createAnnouncement,
  setAnnouncementStatus,
  type AnnouncementSeverity,
  type AnnouncementStatus,
} from "@/lib/platform-announcements";

export async function newAnnouncement(input: {
  title: string;
  body: string;
  severity: AnnouncementSeverity;
}): Promise<void> {
  await requireAdmin();
  if (!input.title.trim()) return;
  await createAnnouncement({
    title: input.title.trim(),
    body: input.body.trim(),
    severity: input.severity,
  });
  revalidatePath("/admin/announcements");
}

export async function changeAnnouncementStatus(input: {
  id: string;
  status: AnnouncementStatus;
}): Promise<void> {
  await requireAdmin();
  await setAnnouncementStatus(input);
  revalidatePath("/admin/announcements");
}
