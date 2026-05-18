"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createDefinition,
  updateDefinition,
  deleteDefinition,
  createRecord,
  updateRecord,
  deleteRecord,
  type CustomObjectField,
} from "@/lib/custom-objects";

const BASE = "/settings/customize/objects";

// ── Definitions ─────────────────────────────────────────────────────

export async function addDefinition(label: string): Promise<void> {
  if (!label.trim()) return;
  const tenant = await getCurrentTenant();
  await createDefinition(tenant.id, label.trim());
  revalidatePath(BASE);
}

export async function saveDefinition(input: {
  id: string;
  label: string;
  pluralLabel: string;
  icon: string;
  fields: CustomObjectField[];
  titleFieldKey: string;
}): Promise<void> {
  if (!input.label.trim()) return;
  const tenant = await getCurrentTenant();
  await updateDefinition({ tenantId: tenant.id, ...input });
  revalidatePath(BASE);
}

export async function removeDefinition(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteDefinition(tenant.id, id);
  revalidatePath(BASE);
}

// ── Records ─────────────────────────────────────────────────────────

export async function addRecord(
  slug: string,
  definitionId: string,
  values: Record<string, string>,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await createRecord(tenant.id, definitionId, values);
  revalidatePath(`${BASE}/${slug}`);
}

export async function saveRecord(
  slug: string,
  id: string,
  values: Record<string, string>,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await updateRecord(tenant.id, id, values);
  revalidatePath(`${BASE}/${slug}`);
}

export async function removeRecord(
  slug: string,
  id: string,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteRecord(tenant.id, id);
  revalidatePath(`${BASE}/${slug}`);
}
