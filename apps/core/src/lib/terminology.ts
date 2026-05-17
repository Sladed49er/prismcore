import { listTerminology } from "@/lib/customization";

/**
 * Terminology resolution — turns a tenant's `tenant_terminology` overrides into
 * a fast lookup the shell and pages use to render the tenant's own words
 * instead of the platform defaults. A missing key always falls back to the
 * default, so the app reads correctly for a tenant with no overrides at all.
 */
export type TermMap = Map<string, string>;

/** Load a tenant's terminology overrides into a lookup map. */
export async function loadTerms(tenantId: string): Promise<TermMap> {
  const rows = await listTerminology(tenantId);
  return new Map(rows.map((r) => [r.termKey, r.label]));
}

/** Resolve a namespaced term key, falling back to the platform default. */
export function term(map: TermMap, key: string, fallback: string): string {
  return map.get(key) || fallback;
}

/** The tenant's name for a module (`module:<id>`). */
export function moduleLabel(
  map: TermMap,
  moduleId: string,
  fallback: string,
): string {
  return term(map, `module:${moduleId}`, fallback);
}

/** The tenant's name for a record type (`entity:<entityKey>`). */
export function recordLabel(
  map: TermMap,
  entityKey: string,
  fallback: string,
): string {
  return term(map, `entity:${entityKey}`, fallback);
}
