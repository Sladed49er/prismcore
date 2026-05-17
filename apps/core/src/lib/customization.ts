import { and, eq } from "drizzle-orm";
import {
  adminDb,
  tenantCustomFields,
  type TenantCustomField,
} from "@prismcore/db";

type FieldType = "text" | "number" | "date" | "select" | "checkbox";

/** Every custom field defined for a tenant, across all entities. */
export async function listCustomFields(
  tenantId: string,
): Promise<TenantCustomField[]> {
  return adminDb()
    .select()
    .from(tenantCustomFields)
    .where(eq(tenantCustomFields.tenantId, tenantId));
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

  await adminDb()
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
}

/** Remove a custom field (scoped to the tenant, so ids cannot be guessed across tenants). */
export async function removeCustomField(
  tenantId: string,
  fieldId: string,
): Promise<void> {
  await adminDb()
    .delete(tenantCustomFields)
    .where(
      and(
        eq(tenantCustomFields.tenantId, tenantId),
        eq(tenantCustomFields.id, fieldId),
      ),
    );
}
