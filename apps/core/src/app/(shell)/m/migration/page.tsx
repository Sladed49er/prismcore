import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listMigrationJobs, listFieldMappings } from "@/lib/migration";
import {
  MigrationPanel,
  type MigrationJobDTO,
} from "@/components/migration-panel";
import {
  MigrationFieldMappingsPanel,
  type FieldMappingDTO,
  type JobOption,
} from "@/components/migration-field-mappings-panel";

/**
 * Migration module — legacy-AMS data-import jobs and the source→target field
 * map behind each.
 */
export default async function MigrationPage() {
  await requireModule("migration");
  const { config } = await loadCurrentTenant();
  const [jobRows, mappingRows] = await Promise.all([
    listMigrationJobs(config.id),
    listFieldMappings(config.id),
  ]);

  const jobs: MigrationJobDTO[] = jobRows.map((j) => ({
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

  const mappings: FieldMappingDTO[] = mappingRows.map((m) => ({
    id: m.id,
    jobName: m.jobName,
    sourceField: m.sourceField,
    targetField: m.targetField,
    transform: m.transform,
    status: m.status,
  }));

  const jobOptions: JobOption[] = jobRows.map((j) => ({
    id: j.id,
    name: j.name,
  }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Migration</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Move onto Prism Core from a legacy system — track each import job and
        map its fields to Prism Core&rsquo;s.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Import jobs</h2>
      <MigrationPanel jobs={jobs} />

      <h2 className="mt-10 text-lg font-semibold">Field mappings</h2>
      <p className="mt-1 text-sm text-gray-500">
        How each legacy field maps into Prism Core for a job.
      </p>
      <MigrationFieldMappingsPanel mappings={mappings} jobs={jobOptions} />
    </div>
  );
}
