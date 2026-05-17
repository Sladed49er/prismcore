import { loadCurrentTenant } from "@/lib/kernel";
import {
  listCustomFields,
  listTerminology,
  listOptionSets,
  listSavedViews,
  getBranding,
} from "@/lib/customization";
import {
  CustomizeHub,
  type EntityRef,
  type CustomFieldDTO,
  type TermItemDTO,
  type OptionSetDTO,
  type SavedViewDTO,
  type BrandingDTO,
} from "@/components/customize-hub";

/**
 * Self-service customization hub. Everything here is customization-as-data —
 * the tenant reshapes its own workspace (fields, terminology, picklists,
 * saved views, branding) and Postgres RLS keeps every change isolated to
 * this tenant. The customizable surface grows automatically as modules are
 * added, because each module declares its own `customizableEntities`.
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

  const [fieldRows, termRows, optionSetRows, viewRows, branding] =
    await Promise.all([
      listCustomFields(config.id),
      listTerminology(config.id),
      listOptionSets(config.id),
      listSavedViews(config.id),
      getBranding(config.id),
    ]);

  const fields: CustomFieldDTO[] = fieldRows.map((r) => ({
    id: r.id,
    entityKey: r.entityKey,
    label: r.label,
    fieldType: r.fieldType,
    required: r.required,
  }));

  // What can be renamed: every enabled module, and every customizable entity.
  const overrides = new Map(termRows.map((t) => [t.termKey, t.label]));
  const termItems: TermItemDTO[] = [
    ...modules.map((m) => ({
      termKey: `module:${m.id}`,
      kind: "Module" as const,
      defaultLabel: m.name,
      currentLabel: overrides.get(`module:${m.id}`) ?? null,
    })),
    ...entities.map((e) => ({
      termKey: `entity:${e.entityKey}`,
      kind: "Record" as const,
      defaultLabel: e.label,
      currentLabel: overrides.get(`entity:${e.entityKey}`) ?? null,
    })),
  ];

  const optionSets: OptionSetDTO[] = optionSetRows.map(({ set, items }) => ({
    id: set.id,
    setKey: set.setKey,
    name: set.name,
    description: set.description,
    isCoreOverride: set.isCoreOverride,
    items: items.map((i) => ({
      id: i.id,
      value: i.value,
      label: i.label,
      color: i.color,
      sortOrder: i.sortOrder,
      active: i.active,
    })),
  }));

  const views: SavedViewDTO[] = viewRows.map((v) => ({
    id: v.id,
    listKey: v.listKey,
    name: v.name,
    isDefault: v.isDefault,
    columnCount: v.config.columns?.length ?? 0,
  }));

  const brandingDto: BrandingDTO = {
    workspaceName: branding?.workspaceName ?? "",
    accentColor: branding?.accentColor ?? "#4f46e5",
    logoUrl: branding?.logoUrl ?? "",
  };

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-2xl font-semibold">Customize</h1>
      <p className="mt-1 text-sm text-gray-600">
        Reshape this workspace to fit how you work — no code. Every change
        stays inside your tenant.
      </p>
      <CustomizeHub
        entities={entities}
        fields={fields}
        termItems={termItems}
        optionSets={optionSets}
        views={views}
        branding={brandingDto}
      />
    </div>
  );
}
