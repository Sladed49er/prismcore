import Link from "next/link";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  listPublishedAnnouncements,
  type PlatformAnnouncement,
} from "@/lib/platform-announcements";

const SEVERITY_COLOR: Record<PlatformAnnouncement["severity"], string> = {
  info: "bg-blue-50 text-blue-700",
  warning: "bg-amber-50 text-amber-700",
  critical: "bg-rose-50 text-rose-700",
};

/** Published platform announcements — the customer-facing notice feed. */
export default async function SupportAnnouncementsPage() {
  await getCurrentTenant();
  const announcements = await listPublishedAnnouncements();

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/support"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Account
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Announcements</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Maintenance notices, security advisories, and release notes from the
        Prism team.
      </p>

      <div className="mt-6 space-y-3">
        {announcements.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No announcements right now.
          </p>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_COLOR[a.severity]}`}
                >
                  {a.severity}
                </span>
                {a.publishedAt ? (
                  <span className="text-xs text-gray-400">
                    {a.publishedAt.toISOString().slice(0, 10)}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-1.5 font-semibold">{a.title}</h3>
              {a.body ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                  {a.body}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
