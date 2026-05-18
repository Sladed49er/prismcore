import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listMigrationJobs } from "@/lib/migration";
import {
  MigrationPanel,
  type MigrationJobDTO,
} from "@/components/migration-panel";

/**
 * Migration module — tracks legacy-AMS data-import jobs during onboarding,
 * one per entity type, with expected/imported/failed counts and progress.
 */
export default async function MigrationPage() {
  await requireModule("migration");
  const { config } = await loadCurrentTenant();
  const rows = await listMigrationJobs(config.id);

  const jobs: MigrationJobDTO[] = rows.map((j) => ({
    id: j.id,
    name: j.name,
    sourceSystem: j.sourceSystem,
    entityType: j.entityType,
    status: j.status,
    recordsExpected: j.recordsExpected,
    recordsImported: j.recordsImported,
    recordsFailed: j.recordsFailed,
    notes: j.notes,
  }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Migration</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Move onto Prism Core from a legacy system. Track each import job — by
        source system and entity type — with live progress as records land.
      </p>
      <MigrationPanel jobs={jobs} />
    </div>
  );
}
