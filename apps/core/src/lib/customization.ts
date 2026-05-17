import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  tenantCustomFields,
  tenantTerminology,
  tenantOptionSets,
  tenantOptionItems,
  tenantSavedViews,
  tenantBranding,
  tenantCustomizationLog,
  type TenantCustomField,
  type TenantTerminology,
  type TenantOptionSet,
  type TenantOptionItem,
  type TenantSavedView,
  type TenantBranding,
  type TenantCustomizationLogRow,
} from "@prismcore/db";

/**
 * The customization API — the whole self-service surface a tenant uses to
 * reshape its own workspace: custom fields, terminology, picklists, saved
 * views, branding. Every function runs through `withTenantContext`, so it
 * executes as the RLS-bound `prismcore_app` role with the tenant GUC set —
 * Postgres itself guarantees a tenant only ever touches its own rows.
 *
 * This module is also the AI assistant's entire toolbox: the assistant can do
 * exactly what is exported here and nothing else, so it can never reach code
 * or another tenant no matter what it is asked.
 */

type FieldType = "text" | "number" | "date" | "select" | "checkbox";

/* ── Custom fields ──────────────────────────────────────────────────────── */

export async function listCustomFields(
  tenantId: string,
): Promise<TenantCustomField[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tenantCustomFields)
      .where(eq(tenantCustomFields.tenantId, tenantId)),
  );
}

/** Stable, key-safe identifier derived from a human label. */
function slugify(label: string, fallback = "field"): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "") || fallback
  );
}

/** Define a custom field on an entity. Returns the field's id. */
export async function addCustomField(input: {
  tenantId: string;
  moduleId: string;
  entityKey: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  options?: string[];
}): Promise<string> {
  const fieldKey = slugify(input.label);
  return withTenantContext(input.tenantId, async (tx) => {
    const [row] = await tx
      .insert(tenantCustomFields)
      .values({
        tenantId: input.tenantId,
        moduleId: input.moduleId,
        entityKey: input.entityKey,
        fieldKey,
        label: input.label,
        fieldType: input.fieldType,
        required: input.required,
        options: input.options ?? [],
      })
      .onConflictDoNothing()
      .returning({ id: tenantCustomFields.id });
    return row?.id ?? "";
  });
}

export async function removeCustomField(
  tenantId: string,
  fieldId: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(tenantCustomFields)
      .where(
        and(
          eq(tenantCustomFields.tenantId, tenantId),
          eq(tenantCustomFields.id, fieldId),
        ),
      );
  });
}

/* ── Terminology ────────────────────────────────────────────────────────── */

export async function listTerminology(
  tenantId: string,
): Promise<TenantTerminology[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tenantTerminology)
      .where(eq(tenantTerminology.tenantId, tenantId)),
  );
}

/** Set (or update) a terminology override. `termKey` is namespaced, e.g.
 *  `module:clients`, `entity:client.singular`, `entity:client.plural`. */
export async function setTerm(
  tenantId: string,
  termKey: string,
  label: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .insert(tenantTerminology)
      .values({ tenantId, termKey, label })
      .onConflictDoUpdate({
        target: [tenantTerminology.tenantId, tenantTerminology.termKey],
        set: { label, updatedAt: new Date() },
      });
  });
}

/** Remove an override — the term reverts to the platform default. */
export async function clearTerm(
  tenantId: string,
  termKey: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(tenantTerminology)
      .where(
        and(
          eq(tenantTerminology.tenantId, tenantId),
          eq(tenantTerminology.termKey, termKey),
        ),
      );
  });
}

/* ── Option sets (picklists / status overrides) ─────────────────────────── */

export interface OptionSetWithItems {
  set: TenantOptionSet;
  items: TenantOptionItem[];
}

export async function listOptionSets(
  tenantId: string,
): Promise<OptionSetWithItems[]> {
  return withTenantContext(tenantId, async (tx) => {
    const sets = await tx
      .select()
      .from(tenantOptionSets)
      .where(eq(tenantOptionSets.tenantId, tenantId));
    const items = await tx
      .select()
      .from(tenantOptionItems)
      .where(eq(tenantOptionItems.tenantId, tenantId));
    return sets.map((set) => ({
      set,
      items: items
        .filter((i) => i.optionSetId === set.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  });
}

/** Create a picklist. `setKey` starting with `core:` overrides a built-in
 *  status field (its items' values must match the built-in enum values). */
export async function createOptionSet(
  tenantId: string,
  input: { setKey: string; name: string; description?: string },
): Promise<string> {
  const isCoreOverride = input.setKey.startsWith("core:");
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .insert(tenantOptionSets)
      .values({
        tenantId,
        setKey: input.setKey,
        name: input.name,
        description: input.description ?? null,
        isCoreOverride,
      })
      .onConflictDoUpdate({
        target: [tenantOptionSets.tenantId, tenantOptionSets.setKey],
        set: { name: input.name, description: input.description ?? null },
      })
      .returning({ id: tenantOptionSets.id });
    return row?.id ?? "";
  });
}

export async function deleteOptionSet(
  tenantId: string,
  optionSetId: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    // tenant_option_items cascades on the FK, but be explicit under RLS.
    await tx
      .delete(tenantOptionItems)
      .where(
        and(
          eq(tenantOptionItems.tenantId, tenantId),
          eq(tenantOptionItems.optionSetId, optionSetId),
        ),
      );
    await tx
      .delete(tenantOptionSets)
      .where(
        and(
          eq(tenantOptionSets.tenantId, tenantId),
          eq(tenantOptionSets.id, optionSetId),
        ),
      );
  });
}

export async function addOptionItem(
  tenantId: string,
  input: {
    optionSetId: string;
    value: string;
    label: string;
    color?: string;
    sortOrder?: number;
  },
): Promise<string> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .insert(tenantOptionItems)
      .values({
        tenantId,
        optionSetId: input.optionSetId,
        value: input.value,
        label: input.label,
        color: input.color ?? "gray",
        sortOrder: input.sortOrder ?? 0,
      })
      .returning({ id: tenantOptionItems.id });
    return row?.id ?? "";
  });
}

export async function updateOptionItem(
  tenantId: string,
  itemId: string,
  patch: Partial<{
    label: string;
    color: string;
    sortOrder: number;
    active: boolean;
  }>,
): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(tenantOptionItems)
      .set(patch)
      .where(
        and(
          eq(tenantOptionItems.tenantId, tenantId),
          eq(tenantOptionItems.id, itemId),
        ),
      );
  });
}

export async function removeOptionItem(
  tenantId: string,
  itemId: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(tenantOptionItems)
      .where(
        and(
          eq(tenantOptionItems.tenantId, tenantId),
          eq(tenantOptionItems.id, itemId),
        ),
      );
  });
}

/* ── Saved list views ───────────────────────────────────────────────────── */

export async function listSavedViews(
  tenantId: string,
  listKey?: string,
): Promise<TenantSavedView[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tenantSavedViews)
      .where(
        listKey
          ? and(
              eq(tenantSavedViews.tenantId, tenantId),
              eq(tenantSavedViews.listKey, listKey),
            )
          : eq(tenantSavedViews.tenantId, tenantId),
      ),
  );
}

export async function createSavedView(
  tenantId: string,
  input: {
    listKey: string;
    name: string;
    config: TenantSavedView["config"];
    isDefault?: boolean;
  },
): Promise<string> {
  return withTenantContext(tenantId, async (tx) => {
    if (input.isDefault) {
      await tx
        .update(tenantSavedViews)
        .set({ isDefault: false })
        .where(
          and(
            eq(tenantSavedViews.tenantId, tenantId),
            eq(tenantSavedViews.listKey, input.listKey),
          ),
        );
    }
    const [row] = await tx
      .insert(tenantSavedViews)
      .values({
        tenantId,
        listKey: input.listKey,
        name: input.name,
        config: input.config,
        isDefault: input.isDefault ?? false,
      })
      .returning({ id: tenantSavedViews.id });
    return row?.id ?? "";
  });
}

export async function deleteSavedView(
  tenantId: string,
  viewId: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(tenantSavedViews)
      .where(
        and(
          eq(tenantSavedViews.tenantId, tenantId),
          eq(tenantSavedViews.id, viewId),
        ),
      );
  });
}

/** Make one view the default for its list, clearing any other default. */
export async function setDefaultView(
  tenantId: string,
  viewId: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    const [view] = await tx
      .select({ listKey: tenantSavedViews.listKey })
      .from(tenantSavedViews)
      .where(
        and(
          eq(tenantSavedViews.tenantId, tenantId),
          eq(tenantSavedViews.id, viewId),
        ),
      );
    if (!view) return;
    await tx
      .update(tenantSavedViews)
      .set({ isDefault: false })
      .where(
        and(
          eq(tenantSavedViews.tenantId, tenantId),
          eq(tenantSavedViews.listKey, view.listKey),
        ),
      );
    await tx
      .update(tenantSavedViews)
      .set({ isDefault: true })
      .where(
        and(
          eq(tenantSavedViews.tenantId, tenantId),
          eq(tenantSavedViews.id, viewId),
        ),
      );
  });
}

/* ── Branding ───────────────────────────────────────────────────────────── */

export async function getBranding(
  tenantId: string,
): Promise<TenantBranding | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(tenantBranding)
      .where(eq(tenantBranding.tenantId, tenantId));
    return row ?? null;
  });
}

/** Upsert the tenant's branding (one row per tenant). */
export async function setBranding(
  tenantId: string,
  input: {
    workspaceName?: string | null;
    accentColor?: string;
    logoUrl?: string | null;
  },
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .insert(tenantBranding)
      .values({
        tenantId,
        workspaceName: input.workspaceName ?? null,
        accentColor: input.accentColor ?? "#4f46e5",
        logoUrl: input.logoUrl ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: tenantBranding.tenantId,
        set: {
          ...(input.workspaceName !== undefined
            ? { workspaceName: input.workspaceName }
            : {}),
          ...(input.accentColor !== undefined
            ? { accentColor: input.accentColor }
            : {}),
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
          updatedAt: new Date(),
        },
      });
  });
}

/* ── Customization audit log ────────────────────────────────────────────── */

/**
 * Record a customization change. Every mutation above should be paired with
 * one of these from the action / AI-tool layer — it is the safeguard that
 * keeps an autonomous AI change visible and reversible.
 */
export async function logCustomization(
  tenantId: string,
  entry: {
    actorType: "user" | "ai";
    actorName: string;
    action: string;
    summary: string;
    undo?: Record<string, unknown>;
  },
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.insert(tenantCustomizationLog).values({
      tenantId,
      actorType: entry.actorType,
      actorName: entry.actorName,
      action: entry.action,
      summary: entry.summary,
      undo: entry.undo ?? {},
    });
  });
}

export async function listCustomizationLog(
  tenantId: string,
  limit = 100,
): Promise<TenantCustomizationLogRow[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tenantCustomizationLog)
      .where(eq(tenantCustomizationLog.tenantId, tenantId))
      .orderBy(desc(tenantCustomizationLog.createdAt))
      .limit(limit),
  );
}
