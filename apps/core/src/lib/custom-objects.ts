import { and, desc, eq, inArray } from "drizzle-orm";
import {
  withTenantContext,
  customObjectDefinitions,
  customObjectRecords,
  type CustomObjectDefinition,
  type CustomObjectRecord,
  type CustomObjectField,
} from "@prismcore/db";

/**
 * Custom objects — Salesforce-style user-defined record types.
 *
 * A definition is a typed field list under a tenant-unique slug; records are
 * the rows created against it. All RLS-scoped through `withTenantContext`.
 */

export type { CustomObjectDefinition, CustomObjectRecord, CustomObjectField };

const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "email",
  "phone",
  "url",
] as const;

/** Validate a raw field list into the stored shape. */
export function cleanFields(raw: unknown): CustomObjectField[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f, i) => {
      const type = String(f.type ?? "text");
      const label = String(f.label ?? "").slice(0, 120);
      return {
        key:
          String(f.key ?? "").trim() ||
          label.toLowerCase().replace(/[^a-z0-9]+/g, "_") ||
          `field_${i + 1}`,
        label,
        type: (FIELD_TYPES as readonly string[]).includes(type)
          ? type
          : "text",
        required: Boolean(f.required),
        options: Array.isArray(f.options)
          ? f.options.map((o) => String(o).slice(0, 120)).slice(0, 40)
          : [],
      };
    })
    .filter((f) => f.label);
}

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "object"
  );
}

// ── Definitions ─────────────────────────────────────────────────────

export async function listDefinitions(
  tenantId: string,
): Promise<CustomObjectDefinition[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(customObjectDefinitions)
      .where(eq(customObjectDefinitions.tenantId, tenantId))
      .orderBy(desc(customObjectDefinitions.createdAt)),
  );
}

export async function getDefinitionBySlug(
  tenantId: string,
  slug: string,
): Promise<CustomObjectDefinition | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(customObjectDefinitions)
      .where(
        and(
          eq(customObjectDefinitions.tenantId, tenantId),
          eq(customObjectDefinitions.slug, slug),
        ),
      );
    return row ?? null;
  });
}

/** Create a definition; the slug is derived from the label and uniquified. */
export async function createDefinition(
  tenantId: string,
  label: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    const existing = await tx
      .select({ slug: customObjectDefinitions.slug })
      .from(customObjectDefinitions)
      .where(eq(customObjectDefinitions.tenantId, tenantId));
    const taken = new Set(existing.map((e) => e.slug));
    const base = slugify(label);
    let slug = base;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;

    await tx.insert(customObjectDefinitions).values({
      tenantId,
      slug,
      label: label.trim(),
      pluralLabel: `${label.trim()}s`,
      fields: [
        { key: "name", label: "Name", type: "text", required: true, options: [] },
      ],
      titleFieldKey: "name",
    });
  });
}

export async function updateDefinition(input: {
  tenantId: string;
  id: string;
  label: string;
  pluralLabel: string;
  icon: string;
  fields: CustomObjectField[];
  titleFieldKey: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    const fields = cleanFields(input.fields);
    const titleKey = fields.some((f) => f.key === input.titleFieldKey)
      ? input.titleFieldKey
      : (fields[0]?.key ?? "");
    await tx
      .update(customObjectDefinitions)
      .set({
        label: input.label.trim(),
        pluralLabel: input.pluralLabel.trim() || `${input.label.trim()}s`,
        icon: input.icon.trim() || "box",
        fields,
        titleFieldKey: titleKey,
        updatedAt: new Date(),
      })
      .where(eq(customObjectDefinitions.id, input.id));
  });
}

export async function deleteDefinition(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(customObjectDefinitions)
      .where(eq(customObjectDefinitions.id, id));
  });
}

/** Record counts keyed by definition id — for the definitions list. */
export async function countRecords(
  tenantId: string,
  definitionIds: string[],
): Promise<Record<string, number>> {
  if (definitionIds.length === 0) return {};
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ definitionId: customObjectRecords.definitionId })
      .from(customObjectRecords)
      .where(
        and(
          eq(customObjectRecords.tenantId, tenantId),
          inArray(customObjectRecords.definitionId, definitionIds),
        ),
      );
    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.definitionId] = (counts[r.definitionId] ?? 0) + 1;
    }
    return counts;
  });
}

// ── Records ─────────────────────────────────────────────────────────

export async function listRecords(
  tenantId: string,
  definitionId: string,
): Promise<CustomObjectRecord[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(customObjectRecords)
      .where(
        and(
          eq(customObjectRecords.tenantId, tenantId),
          eq(customObjectRecords.definitionId, definitionId),
        ),
      )
      .orderBy(desc(customObjectRecords.createdAt)),
  );
}

export async function createRecord(
  tenantId: string,
  definitionId: string,
  values: Record<string, string>,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .insert(customObjectRecords)
      .values({ tenantId, definitionId, values });
  });
}

export async function updateRecord(
  tenantId: string,
  id: string,
  values: Record<string, string>,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(customObjectRecords)
      .set({ values, updatedAt: new Date() })
      .where(eq(customObjectRecords.id, id));
  });
}

export async function deleteRecord(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(customObjectRecords)
      .where(eq(customObjectRecords.id, id));
  });
}

/** The display title of a record — its title field, or the first value. */
export function recordTitle(
  def: Pick<CustomObjectDefinition, "titleFieldKey" | "fields">,
  record: Pick<CustomObjectRecord, "values">,
): string {
  const byTitle = record.values[def.titleFieldKey];
  if (byTitle) return byTitle;
  for (const f of def.fields) {
    if (record.values[f.key]) return record.values[f.key]!;
  }
  return "Untitled record";
}
