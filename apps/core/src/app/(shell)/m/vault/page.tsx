import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listVaultCredentials } from "@/lib/vault";
import { VaultPanel, type VaultCredentialDTO } from "@/components/vault-panel";

/**
 * Password Vault module — shared agency credentials for carrier portals,
 * banking, and software logins. Passwords are encrypted at rest and only
 * decrypted on an explicit reveal/copy.
 */
export default async function VaultPage() {
  await requireModule("vault");
  const { config } = await loadCurrentTenant();
  const rows = await listVaultCredentials(config.id);

  const credentials: VaultCredentialDTO[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    url: r.url,
    username: r.username,
    hasSecret: r.hasSecret,
    notes: r.notes,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Password Vault</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Shared logins your team needs — carrier portals, banking, software.
        Passwords are encrypted at rest and revealed only on demand.
      </p>
      <VaultPanel credentials={credentials} />
    </div>
  );
}
