import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCurrentTenant } from "@/lib/kernel";
import {
  getDefinitionBySlug,
  listRecords,
  recordTitle,
} from "@/lib/custom-objects";
import {
  CustomObjectRecordsPanel,
  type RecordDTO,
} from "@/components/custom-object-records-panel";

/** Records for one custom object. */
export default async function CustomObjectRecordsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { config } = await loadCurrentTenant();
  const def = await getDefinitionBySlug(config.id, slug);
  if (!def) notFound();

  const recordRows = await listRecords(config.id, def.id);
  const records: RecordDTO[] = recordRows.map((r) => ({
    id: r.id,
    title: recordTitle(def, r),
    values: r.values,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/settings/customize/objects"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Custom Objects
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">{def.pluralLabel}</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Records for the <strong>{def.label}</strong> object. Edit the
        object&rsquo;s fields on the Custom Objects page.
      </p>
      <CustomObjectRecordsPanel
        slug={slug}
        definitionId={def.id}
        fields={def.fields}
        records={records}
      />
    </div>
  );
}
