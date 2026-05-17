"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { currentActorName } from "@/lib/actor";
import {
  addCustomField,
  removeCustomField,
  restoreCustomField,
  setTerm,
  clearTerm,
  createOptionSet,
  deleteOptionSet,
  addOptionItem,
  updateOptionItem,
  removeOptionItem,
  deleteSavedView,
  setDefaultView,
  setBranding,
  logCustomization,
} from "@/lib/customization";

type FieldType = "text" | "number" | "date" | "select" | "checkbox";

const CUSTOMIZE_PATH = "/settings/customize";

/** Log a customization change against the acting user. */
async function record(
  tenantId: string,
  action: string,
  summary: string,
  undo?: Record<string, unknown>,
): Promise<void> {
  const actorName = await currentActorName();
  await logCustomization(tenantId, {
    actorType: "user",
    actorName,
    action,
    summary,
    undo,
  });
}

/* ── Custom fields ──────────────────────────────────────────────────────── */

export async function addField(input: {
  moduleId: string;
  entityKey: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  options?: string[];
}): Promise<void> {
  const label = input.label.trim();
  if (!label) return;
  const tenant = await getCurrentTenant();
  const id = await addCustomField({ ...input, label, tenantId: tenant.id });
  await record(
    tenant.id,
    "field.add",
    `Added the "${label}" field to ${input.entityKey}`,
    { fieldId: id },
  );
  revalidatePath(CUSTOMIZE_PATH);
}

/** Archive a field — the definition is kept as a historical record. */
export async function removeField(fieldId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  const archived = await removeCustomField(tenant.id, fieldId);
  await record(
    tenant.id,
    "field.archive",
    archived
      ? `Archived the "${archived.label}" field on ${archived.entityKey}`
      : "Archived a custom field",
    // Keep the full prior definition so the change is reversible and the
    // field stays identifiable even if the row is ever purged.
    archived
      ? {
          field: {
            id: archived.id,
            moduleId: archived.moduleId,
            entityKey: archived.entityKey,
            fieldKey: archived.fieldKey,
            label: archived.label,
            fieldType: archived.fieldType,
            required: archived.required,
            options: archived.options,
          },
        }
      : undefined,
  );
  revalidatePath(CUSTOMIZE_PATH);
}

/** Restore an archived field to active use. */
export async function restoreField(fieldId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await restoreCustomField(tenant.id, fieldId);
  await record(
    tenant.id,
    "field.restore",
    "Restored an archived custom field",
    { fieldId },
  );
  revalidatePath(CUSTOMIZE_PATH);
}

/* ── Terminology ────────────────────────────────────────────────────────── */

export async function saveTerm(termKey: string, label: string): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) return;
  const tenant = await getCurrentTenant();
  await setTerm(tenant.id, termKey, trimmed);
  await record(
    tenant.id,
    "terminology.set",
    `Renamed "${termKey}" to "${trimmed}"`,
    { termKey },
  );
  revalidatePath(CUSTOMIZE_PATH);
}

export async function resetTerm(termKey: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await clearTerm(tenant.id, termKey);
  await record(
    tenant.id,
    "terminology.clear",
    `Reset "${termKey}" to the default name`,
  );
  revalidatePath(CUSTOMIZE_PATH);
}

/* ── Option sets (picklists / status overrides) ─────────────────────────── */

export async function newOptionSet(input: {
  setKey: string;
  name: string;
  description?: string;
}): Promise<void> {
  const setKey = input.setKey.trim();
  const name = input.name.trim();
  if (!setKey || !name) return;
  const tenant = await getCurrentTenant();
  const id = await createOptionSet(tenant.id, { ...input, setKey, name });
  await record(
    tenant.id,
    "optionset.create",
    `Created the "${name}" picklist`,
    { optionSetId: id },
  );
  revalidatePath(CUSTOMIZE_PATH);
}

export async function removeOptionSet(optionSetId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteOptionSet(tenant.id, optionSetId);
  await record(tenant.id, "optionset.delete", "Deleted a picklist");
  revalidatePath(CUSTOMIZE_PATH);
}

export async function newOptionItem(input: {
  optionSetId: string;
  value: string;
  label: string;
  color?: string;
  sortOrder?: number;
}): Promise<void> {
  const label = input.label.trim();
  if (!label) return;
  const value = (input.value.trim() || label).toLowerCase();
  const tenant = await getCurrentTenant();
  const id = await addOptionItem(tenant.id, { ...input, label, value });
  await record(tenant.id, "optionitem.add", `Added the "${label}" option`, {
    optionItemId: id,
  });
  revalidatePath(CUSTOMIZE_PATH);
}

export async function editOptionItem(
  itemId: string,
  patch: Partial<{
    label: string;
    color: string;
    sortOrder: number;
    active: boolean;
  }>,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await updateOptionItem(tenant.id, itemId, patch);
  await record(tenant.id, "optionitem.edit", "Edited a picklist option");
  revalidatePath(CUSTOMIZE_PATH);
}

export async function deleteOptionItem(itemId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await removeOptionItem(tenant.id, itemId);
  await record(tenant.id, "optionitem.remove", "Removed a picklist option");
  revalidatePath(CUSTOMIZE_PATH);
}

/* ── Saved views ────────────────────────────────────────────────────────── */

export async function removeSavedView(viewId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteSavedView(tenant.id, viewId);
  await record(tenant.id, "view.delete", "Deleted a saved view");
  revalidatePath(CUSTOMIZE_PATH);
}

export async function makeViewDefault(viewId: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await setDefaultView(tenant.id, viewId);
  await record(tenant.id, "view.default", "Changed the default saved view");
  revalidatePath(CUSTOMIZE_PATH);
}

/* ── Branding ───────────────────────────────────────────────────────────── */

export async function saveBranding(input: {
  workspaceName: string;
  accentColor: string;
  logoUrl: string;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setBranding(tenant.id, {
    workspaceName: input.workspaceName.trim() || null,
    accentColor: input.accentColor.trim() || "#4f46e5",
    logoUrl: input.logoUrl.trim() || null,
  });
  await record(tenant.id, "branding.set", "Updated the workspace branding");
  revalidatePath(CUSTOMIZE_PATH);
  revalidatePath("/", "layout");
}
