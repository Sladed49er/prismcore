import { loadCurrentTenant } from "@/lib/kernel";
import { listCustomFields } from "@/lib/customization";
import {
  CustomizePanel,
  type EntityRef,
  type CustomFieldDTO,
} from "@/components/customize-panel";

/**
 * Self-service customization. The list of customizable entities is derived from
 * the tenant's enabled modules (each module declares `customizableEntities`), so
 * what you can customize grows automatically as modules are added.
 */
export default async function CustomizePage() {
  const { config, modules } = await loadCurrentTenant();

  const entities: EntityRef[] = modules.flatMap((m) =>
    (m.customizableEntities ?? []).map((e) => ({
      moduleId: m.id,
      moduleName: m.name,
      entityKey: e.key,
      label: e.label,
    })),
  );

  const rows = await listCustomFields(config.id);
  const fields: CustomFieldDTO[] = rows.map((r) => ({
    id: r.id,
    entityKey: r.entityKey,
    label: r.label,
    fieldType: r.fieldType,
    required: r.required,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-2xl font-semibold">Customize</h1>
      <p className="mt-1 text-sm text-gray-600">
        Add your own fields to any record. No code — this is your workspace, your
        way.
      </p>
      {entities.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          No customizable modules are enabled yet. Add modules from the composer.
        </p>
      ) : (
        <CustomizePanel entities={entities} fields={fields} />
      )}
    </div>
  );
}
