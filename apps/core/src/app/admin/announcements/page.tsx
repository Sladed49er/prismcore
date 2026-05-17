import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAnnouncements } from "@/lib/platform-announcements";
import {
  AdminAnnouncementsPanel,
  type AnnouncementDTO,
} from "@/components/admin-announcements-panel";

/** Platform-admin announcements — broadcasts to every tenant. */
export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const rows = await listAnnouncements();

  const announcements: AnnouncementDTO[] = rows.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    severity: a.severity,
    status: a.status,
    publishedAt: a.publishedAt
      ? a.publishedAt.toISOString().slice(0, 10)
      : null,
  }));

  return (
    <main className="mx-auto max-w-3xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
            Platform Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Announcements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Broadcasts to every tenant — maintenance windows, security
            advisories, and release notes.
          </p>
        </div>
        <Link
          href="/admin"
          className="shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
        >
          ← Console
        </Link>
      </div>
      <AdminAnnouncementsPanel announcements={announcements} />
    </main>
  );
}
