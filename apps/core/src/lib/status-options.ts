import { listOptionSets } from "@/lib/customization";

/**
 * Status-field customization.
 *
 * Built-in status fields (client status, invoice status, …) store a fixed
 * enum value in the database. A tenant can restyle them — relabel, recolour,
 * reorder — by creating a `core:<key>` option set in the customization hub.
 * The stored enum value is NEVER changed, so the database stays valid; only
 * the presentation is the tenant's own.
 */

export interface StatusOption {
  /** The enum value stored in the database — never customized. */
  value: string;
  /** The tenant-facing label. */
  label: string;
  /** Badge colour key (see `badge-colors`). */
  color: string;
}

/**
 * Resolve the effective options for a built-in status field: a tenant's
 * `core:<key>` option-set override applied over the platform defaults.
 *
 * Only override items whose `value` matches a real default value are honoured
 * (an unknown value could never be stored). Any default the override omits is
 * appended, so a status can never silently disappear from the picker.
 */
export async function resolveStatusOptions(
  tenantId: string,
  key: string,
  defaults: StatusOption[],
): Promise<StatusOption[]> {
  const sets = await listOptionSets(tenantId);
  const override = sets.find((s) => s.set.setKey === `core:${key}`);
  if (!override) return defaults;

  const valid = new Map(defaults.map((d) => [d.value, d]));
  const resolved: StatusOption[] = override.items
    .filter((i) => i.active && valid.has(i.value))
    .map((i) => ({ value: i.value, label: i.label, color: i.color }));

  for (const d of defaults) {
    if (!resolved.some((r) => r.value === d.value)) resolved.push(d);
  }
  return resolved.length > 0 ? resolved : defaults;
}
