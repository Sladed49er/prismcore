import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listChapters } from "@/lib/chapters";
import { ChaptersPanel, type ChapterDTO } from "@/components/chapters-panel";

/**
 * Chapters module — the geographic and functional chapters of an association,
 * with their leaders, regions, and member counts.
 */
export default async function ChaptersPage() {
  await requireModule("chapters");
  const { config } = await loadCurrentTenant();
  const rows = await listChapters(config.id);

  const chapters: ChapterDTO[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    region: c.region,
    leaderName: c.leaderName,
    memberCount: c.memberCount,
    status: c.status,
    notes: c.notes,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Association
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Chapters</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The chapters that organize your membership — geographic, functional, or
        student — each with its leader and roster size.
      </p>
      <ChaptersPanel chapters={chapters} />
    </div>
  );
}
