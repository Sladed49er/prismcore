import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listChapters, listChapterOfficers } from "@/lib/chapters";
import { ChaptersPanel, type ChapterDTO } from "@/components/chapters-panel";
import {
  ChapterOfficersPanel,
  type ChapterOfficerDTO,
  type ChapterOption,
} from "@/components/chapter-officers-panel";

/**
 * Chapters module — the chapters of an association and their officers.
 */
export default async function ChaptersPage() {
  await requireModule("chapters");
  const { config } = await loadCurrentTenant();
  const [chapterRows, officerRows] = await Promise.all([
    listChapters(config.id),
    listChapterOfficers(config.id),
  ]);

  const chapters: ChapterDTO[] = chapterRows.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    region: c.region,
    leaderName: c.leaderName,
    memberCount: c.memberCount,
    status: c.status,
    notes: c.notes,
  }));

  const officers: ChapterOfficerDTO[] = officerRows.map((o) => ({
    id: o.id,
    chapterName: o.chapterName,
    name: o.name,
    role: o.role,
    email: o.email,
    phone: o.phone,
    termEnd: o.termEnd,
  }));

  const chapterOptions: ChapterOption[] = chapterRows.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Association
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Chapters</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The chapters that organize your membership, and the officers who lead
        them.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Chapters</h2>
      <ChaptersPanel chapters={chapters} />

      <h2 className="mt-10 text-lg font-semibold">Officers</h2>
      <p className="mt-1 text-sm text-gray-500">
        The elected and appointed leaders of each chapter.
      </p>
      <ChapterOfficersPanel officers={officers} chapters={chapterOptions} />
    </div>
  );
}
