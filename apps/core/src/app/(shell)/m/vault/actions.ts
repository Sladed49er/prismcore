"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createVaultCredential,
  updateVaultCredential,
  deleteVaultCredential,
  revealVaultSecret,
  type VaultCategory,
} from "@/lib/vault";

const CATEGORIES: VaultCategory[] = [
  "carrier",
  "banking",
  "software",
  "system",
  "other",
];

function cat(value: string): VaultCategory {
  return CATEGORIES.includes(value as VaultCategory)
    ? (value as VaultCategory)
    : "other";
}

export async function newCredential(input: {
  name: string;
  category: string;
  url: string;
  username: string;
  secret: string;
  notes: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createVaultCredential({
    tenantId: tenant.id,
    name: input.name.trim(),
    category: cat(input.category),
    url: input.url.trim(),
    username: input.username.trim(),
    secret: input.secret,
    notes: input.notes.trim(),
  });
  revalidatePath("/m/vault");
}

export async function editCredential(input: {
  id: string;
  name: string;
  category: string;
  url: string;
  username: string;
  /** Empty string leaves the stored secret unchanged. */
  secret: string;
  notes: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateVaultCredential({
    tenantId: tenant.id,
    id: input.id,
    name: input.name.trim(),
    category: cat(input.category),
    url: input.url.trim(),
    username: input.username.trim(),
    secret: input.secret === "" ? null : input.secret,
    notes: input.notes.trim(),
  });
  revalidatePath("/m/vault");
}

export async function removeCredential(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteVaultCredential(tenant.id, id);
  revalidatePath("/m/vault");
}

/** Decrypt one entry's password — called when the user clicks reveal/copy. */
export async function revealCredential(id: string): Promise<string> {
  const tenant = await getCurrentTenant();
  return revealVaultSecret(tenant.id, id);
}
