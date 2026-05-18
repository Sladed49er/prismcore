import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  carrierAppetiteRules,
  carriers,
} from "@prismcore/db";

/**
 * Carrier appetite — per-carrier underwriting-appetite rules keyed by NAICS
 * industry-code prefix, ported from PrismAMS.
 *
 * `matchCarriers` takes a risk's NAICS code and returns each carrier's
 * appetite, picking the most-specific matching rule per carrier (the longest
 * matching prefix wins) and ranking the result preferred → declined.
 */

export type Appetite = "preferred" | "neutral" | "restricted" | "declined";
const APPETITES: Appetite[] = [
  "preferred",
  "neutral",
  "restricted",
  "declined",
];
const APPETITE_RANK: Record<Appetite, number> = {
  preferred: 0,
  neutral: 1,
  restricted: 2,
  declined: 3,
};

export interface AppetiteRuleRow {
  id: string;
  carrierId: string;
  carrierName: string;
  naicsPrefix: string;
  appetite: string;
  lineOfBusiness: string;
  notes: string;
}

/** Every appetite rule for the tenant, joined to its carrier's name. */
export async function listAppetiteRules(
  tenantId: string,
): Promise<AppetiteRuleRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: carrierAppetiteRules.id,
        carrierId: carrierAppetiteRules.carrierId,
        carrierName: carriers.name,
        naicsPrefix: carrierAppetiteRules.naicsPrefix,
        appetite: carrierAppetiteRules.appetite,
        lineOfBusiness: carrierAppetiteRules.lineOfBusiness,
        notes: carrierAppetiteRules.notes,
      })
      .from(carrierAppetiteRules)
      .innerJoin(carriers, eq(carriers.id, carrierAppetiteRules.carrierId))
      .where(eq(carrierAppetiteRules.tenantId, tenantId))
      .orderBy(desc(carrierAppetiteRules.createdAt));
    return rows;
  });
}

/** Add an appetite rule for a carrier. */
export async function addAppetiteRule(input: {
  tenantId: string;
  carrierId: string;
  naicsPrefix: string;
  appetite: Appetite;
  lineOfBusiness: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(carrierAppetiteRules).values({
      tenantId: input.tenantId,
      carrierId: input.carrierId,
      naicsPrefix: input.naicsPrefix.replace(/\D/g, ""),
      appetite: input.appetite,
      lineOfBusiness: input.lineOfBusiness,
      notes: input.notes,
    });
  });
}

/** Remove an appetite rule. */
export async function deleteAppetiteRule(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(carrierAppetiteRules)
      .where(
        and(
          eq(carrierAppetiteRules.id, id),
          eq(carrierAppetiteRules.tenantId, tenantId),
        ),
      );
  });
}

export interface AppetiteMatch {
  carrierId: string;
  carrierName: string;
  carrierStatus: string;
  appetite: Appetite;
  matchedPrefix: string;
  lineOfBusiness: string;
  notes: string;
}

/**
 * Match carriers to a risk's NAICS code. For each carrier, the rule with the
 * longest prefix that the NAICS code starts with wins; an optional
 * line-of-business narrows which rules apply. Result is ranked preferred →
 * declined, then by carrier name.
 */
export async function matchCarriers(
  tenantId: string,
  naicsCode: string,
  lineOfBusiness?: string,
): Promise<AppetiteMatch[]> {
  const naics = naicsCode.replace(/\D/g, "");
  if (!naics) return [];
  const lob = (lineOfBusiness ?? "").trim().toLowerCase();

  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        carrierId: carrierAppetiteRules.carrierId,
        carrierName: carriers.name,
        carrierStatus: carriers.status,
        naicsPrefix: carrierAppetiteRules.naicsPrefix,
        appetite: carrierAppetiteRules.appetite,
        lineOfBusiness: carrierAppetiteRules.lineOfBusiness,
        notes: carrierAppetiteRules.notes,
      })
      .from(carrierAppetiteRules)
      .innerJoin(carriers, eq(carriers.id, carrierAppetiteRules.carrierId))
      .where(eq(carrierAppetiteRules.tenantId, tenantId));

    // Most-specific rule per carrier — the longest prefix the code starts with.
    const best = new Map<string, AppetiteMatch & { _len: number }>();
    for (const r of rows) {
      if (!naics.startsWith(r.naicsPrefix)) continue;
      const ruleLob = r.lineOfBusiness.trim().toLowerCase();
      if (ruleLob && lob && ruleLob !== lob) continue;
      const current = best.get(r.carrierId);
      if (current && current._len >= r.naicsPrefix.length) continue;
      best.set(r.carrierId, {
        carrierId: r.carrierId,
        carrierName: r.carrierName,
        carrierStatus: r.carrierStatus,
        appetite: APPETITES.includes(r.appetite as Appetite)
          ? (r.appetite as Appetite)
          : "neutral",
        matchedPrefix: r.naicsPrefix,
        lineOfBusiness: r.lineOfBusiness,
        notes: r.notes,
        _len: r.naicsPrefix.length,
      });
    }

    return [...best.values()]
      .map(({ _len, ...m }) => m)
      .sort(
        (a, b) =>
          APPETITE_RANK[a.appetite] - APPETITE_RANK[b.appetite] ||
          a.carrierName.localeCompare(b.carrierName),
      );
  });
}
