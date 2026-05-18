"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createChapter,
  updateChapter,
  setChapterStatus,
  deleteChapter,
  createChapterOfficer,
  deleteChapterOfficer,
  type ChapterType,
  type ChapterStatus,
} from "@/lib/chapters";

const TYPES: ChapterType[] = ["geographic", "functional", "student"];
const STATUSES: ChapterStatus[] = ["active", "forming", "inactive"];

export interface ChapterForm {
  name: string;
  type: string;
  region: string;
  leaderName: string;
  memberCount: string;
  status: string;
  notes: string;
}

function normalize(form: ChapterForm) {
  return {
    name: form.name.trim(),
    type: TYPES.includes(form.type as ChapterType)
      ? (form.type as ChapterType)
      : "geographic",
    region: form.region.trim(),
    leaderName: form.leaderName.trim(),
    memberCount: Math.max(
      0,
      Math.round(Number.parseFloat(form.memberCount) || 0),
    ),
    status: STATUSES.includes(form.status as ChapterStatus)
      ? (form.status as ChapterStatus)
      : "active",
    notes: form.notes.trim(),
  };
}

export async function newChapter(form: ChapterForm): Promise<void> {
  if (!form.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createChapter({ tenantId: tenant.id, ...normalize(form) });
  revalidatePath("/m/chapters");
}

export async function editChapter(
  input: { id: string } & ChapterForm,
): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateChapter({
    tenantId: tenant.id,
    id: input.id,
    ...normalize(input),
  });
  revalidatePath("/m/chapters");
}

export async function updateChapterStatus(input: {
  id: string;
  status: ChapterStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setChapterStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/chapters");
}

export async function removeChapter(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteChapter(tenant.id, id);
  revalidatePath("/m/chapters");
}

/* ── Officers ─────────────────────────────────────────────────────── */

export interface ChapterOfficerForm {
  chapterId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  termEnd: string;
}

export async function newOfficer(form: ChapterOfficerForm): Promise<void> {
  if (!form.chapterId || !form.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createChapterOfficer({
    tenantId: tenant.id,
    chapterId: form.chapterId,
    name: form.name.trim(),
    role: form.role.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    termEnd: form.termEnd || null,
  });
  revalidatePath("/m/chapters");
}

export async function removeOfficer(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteChapterOfficer(tenant.id, id);
  revalidatePath("/m/chapters");
}
