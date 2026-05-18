import Link from "next/link";
import { loadCurrentTenant } from "@/lib/kernel";
import { listDefinitions, countRecords } from "@/lib/custom-objects";
import {
  CustomObjectsPanel,
  type DefinitionDTO,
} from "@/components/custom-objects-panel";

/** Custom objects — user-defined record types, part of the customization kernel. */
export default async function CustomObjectsPage() {
  const { config } = await loadCurrentTenant();
  const defRows = await listDefinitions(config.id);
  const counts = await countRecords(
    config.id,
    defRows.map((d) => d.id),
  );

  const definitions: DefinitionDTO[] = defRows.map((d) => ({
    id: d.id,
    slug: d.slug,
    label: d.label,
    pluralLabel: d.pluralLabel,
    icon: d.icon,
    fields: d.fields,
    titleFieldKey: d.titleFieldKey,
    recordCount: counts[d.id] ?? 0,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/settings/customize"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Customize
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Custom Objects</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Model record types the built-in modules don&rsquo;t cover — define the
        fields, then add and manage records. Each object is private to this
        workspace.
      </p>
      <CustomObjectsPanel definitions={definitions} />
    </div>
  );
}
