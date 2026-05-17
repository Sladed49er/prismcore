import { and, eq } from "drizzle-orm";
import {
  withTenantContext,
  tenantCustomFields,
  type TenantCustomField,
} from "@prismcore/db";

type FieldType = "text" | "number" | "date" | "select" | "checkbox";

/**
 * All custom fields run through `withTenantContext`, so they execute as the
 * RLS-bound `prismcore_app` role with the tenant GUC set — Postgres itself
 * guarantees a tenant can only ever read or write its own fields.
 */
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

/** Define a custom field on an entity. The field key is derived from the label. */
export async function addCustomField(input: {
  tenantId: string;
  moduleId: string;
  entityKey: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
}): Promise<void> {
  const fieldKey =
    input.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "") || "field";

  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .insert(tenantCustomFields)
      .values({
        tenantId: input.tenantId,
        moduleId: input.moduleId,
        entityKey: input.entityKey,
        fieldKey,
        label: input.label,
        fieldType: input.fieldType,
        required: input.required,
      })
      .onConflictDoNothing();
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
