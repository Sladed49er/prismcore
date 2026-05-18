import { desc, eq } from "drizzle-orm";
import { withTenantContext, vaultCredentials } from "@prismcore/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

/**
 * Password Vault data layer — shared agency credentials, encrypted at rest.
 *
 * The stored `secret` column is AES-256-GCM ciphertext. List queries never
 * return it; `revealVaultSecret` decrypts a single entry on demand. All access
 * is RLS-scoped through `withTenantContext`.
 */

export type VaultCategory =
  | "carrier"
  | "banking"
  | "software"
  | "system"
  | "other";

/** A vault row safe to send to the browser — the secret is reduced to a flag. */
export interface VaultCredentialSummary {
  id: string;
  name: string;
  category: VaultCategory;
  url: string;
  username: string;
  hasSecret: boolean;
  notes: string;
  updatedAt: Date;
}

export async function listVaultCredentials(
  tenantId: string,
): Promise<VaultCredentialSummary[]> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(vaultCredentials)
      .where(eq(vaultCredentials.tenantId, tenantId))
      .orderBy(desc(vaultCredentials.updatedAt)),
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    url: r.url,
    username: r.username,
    hasSecret: r.secret !== "",
    notes: r.notes,
    updatedAt: r.updatedAt,
  }));
}

export async function createVaultCredential(input: {
  tenantId: string;
  name: string;
  category: VaultCategory;
  url: string;
  username: string;
  secret: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(vaultCredentials).values({
      tenantId: input.tenantId,
      name: input.name,
      category: input.category,
      url: input.url,
      username: input.username,
      secret: encryptSecret(input.secret),
      notes: input.notes,
    });
  });
}

export async function updateVaultCredential(input: {
  tenantId: string;
  id: string;
  name: string;
  category: VaultCategory;
  url: string;
  username: string;
  /** Null leaves the stored secret untouched; a string replaces it. */
  secret: string | null;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    const patch: Record<string, unknown> = {
      name: input.name,
      category: input.category,
      url: input.url,
      username: input.username,
      notes: input.notes,
      updatedAt: new Date(),
    };
    if (input.secret !== null) patch.secret = encryptSecret(input.secret);
    await tx
      .update(vaultCredentials)
      .set(patch)
      .where(eq(vaultCredentials.id, input.id));
  });
}

export async function deleteVaultCredential(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(vaultCredentials).where(eq(vaultCredentials.id, id));
  });
}

/** Decrypt and return one entry's secret — used by the reveal/copy action. */
export async function revealVaultSecret(
  tenantId: string,
  id: string,
): Promise<string> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select({ secret: vaultCredentials.secret })
      .from(vaultCredentials)
      .where(eq(vaultCredentials.id, id)),
  );
  const stored = rows[0]?.secret;
  return stored ? decryptSecret(stored) : "";
}
