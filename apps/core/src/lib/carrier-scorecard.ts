import { eq } from "drizzle-orm";
import {
  withTenantContext,
  carriers,
  policies,
  claims,
  claimPayments,
  commissions,
} from "@prismcore/db";

/**
 * Carrier scorecard — per-carrier performance, ported from PrismAMS.
 *
 * For each carrier in the directory it rolls up the book placed with them:
 * policy and premium counts, claim activity, an incurred-loss ratio, and
 * commission expected-vs-received. All arithmetic is deterministic — this is
 * a reporting query, not an AI feature. Policies link to a carrier by name
 * (`policies.carrier`), so the rollup matches on the carrier's name.
 */

export interface LineBucket {
  line: string;
  policies: number;
  premiumCents: number;
}

export interface CarrierScorecard {
  carrierId: string;
  carrierName: string;
  status: string;
  policyCount: number;
  activePolicies: number;
  totalPremiumCents: number;
  claimCount: number;
  openClaims: number;
  lossPaidCents: number;
  lossReservedCents: number;
  incurredCents: number;
  /** Incurred loss ÷ in-force premium, as a percentage — null if no premium. */
  lossRatio: number | null;
  commissionExpectedCents: number;
  commissionReceivedCents: number;
  commissionVarianceCents: number;
  byLine: LineBucket[];
}

interface Agg {
  policyIds: Set<string>;
  activePolicies: number;
  totalPremiumCents: number;
  claimIds: Set<string>;
  openClaims: number;
  lossReservedCents: number;
  lossPaidCents: number;
  commissionExpectedCents: number;
  commissionReceivedCents: number;
  byLine: Map<string, LineBucket>;
}

function emptyAgg(): Agg {
  return {
    policyIds: new Set(),
    activePolicies: 0,
    totalPremiumCents: 0,
    claimIds: new Set(),
    openClaims: 0,
    lossReservedCents: 0,
    lossPaidCents: 0,
    commissionExpectedCents: 0,
    commissionReceivedCents: 0,
    byLine: new Map(),
  };
}

/** Compute a scorecard for every carrier in the tenant's directory. */
export async function computeScorecards(
  tenantId: string,
): Promise<CarrierScorecard[]> {
  return withTenantContext(tenantId, async (tx) => {
    const [carrierRows, policyRows, claimRows, paymentRows, commissionRows] =
      await Promise.all([
        tx.select().from(carriers).where(eq(carriers.tenantId, tenantId)),
        tx.select().from(policies).where(eq(policies.tenantId, tenantId)),
        tx.select().from(claims).where(eq(claims.tenantId, tenantId)),
        tx
          .select()
          .from(claimPayments)
          .where(eq(claimPayments.tenantId, tenantId)),
        tx
          .select()
          .from(commissions)
          .where(eq(commissions.tenantId, tenantId)),
      ]);

    // Carrier name → carrier row. Only carriers in the directory are scored.
    const byName = new Map<string, (typeof carrierRows)[number]>();
    for (const c of carrierRows) byName.set(c.name, c);

    // policyId → carrier name, for routing claims and commissions.
    const policyCarrier = new Map<string, string>();
    const aggs = new Map<string, Agg>();
    const aggFor = (name: string): Agg => {
      let a = aggs.get(name);
      if (!a) {
        a = emptyAgg();
        aggs.set(name, a);
      }
      return a;
    };

    for (const p of policyRows) {
      if (!byName.has(p.carrier)) continue;
      policyCarrier.set(p.id, p.carrier);
      const a = aggFor(p.carrier);
      a.policyIds.add(p.id);
      const inForce = p.status === "active";
      if (inForce) {
        a.activePolicies++;
        a.totalPremiumCents += p.premiumCents;
      }
      const line = p.lineOfBusiness.trim() || "Unspecified";
      const bucket = a.byLine.get(line) ?? {
        line,
        policies: 0,
        premiumCents: 0,
      };
      bucket.policies++;
      if (inForce) bucket.premiumCents += p.premiumCents;
      a.byLine.set(line, bucket);
    }

    // claimId → carrier name, so payments can be routed.
    const claimCarrier = new Map<string, string>();
    for (const cl of claimRows) {
      const carrierName = policyCarrier.get(cl.policyId);
      if (!carrierName) continue;
      claimCarrier.set(cl.id, carrierName);
      const a = aggFor(carrierName);
      a.claimIds.add(cl.id);
      if (cl.status === "open" || cl.status === "investigating") a.openClaims++;
      a.lossReservedCents += cl.reserveCents;
    }

    for (const pay of paymentRows) {
      const carrierName = claimCarrier.get(pay.claimId);
      if (!carrierName) continue;
      aggFor(carrierName).lossPaidCents += pay.amountCents;
    }

    for (const co of commissionRows) {
      const carrierName = policyCarrier.get(co.policyId);
      if (!carrierName) continue;
      const a = aggFor(carrierName);
      a.commissionExpectedCents += co.amountCents;
      if (co.status === "received" || co.status === "reconciled") {
        a.commissionReceivedCents += co.amountCents;
      }
    }

    return carrierRows
      .map((c) => {
        const a = aggs.get(c.name) ?? emptyAgg();
        const incurred = a.lossPaidCents + a.lossReservedCents;
        return {
          carrierId: c.id,
          carrierName: c.name,
          status: c.status,
          policyCount: a.policyIds.size,
          activePolicies: a.activePolicies,
          totalPremiumCents: a.totalPremiumCents,
          claimCount: a.claimIds.size,
          openClaims: a.openClaims,
          lossPaidCents: a.lossPaidCents,
          lossReservedCents: a.lossReservedCents,
          incurredCents: incurred,
          lossRatio:
            a.totalPremiumCents > 0
              ? Math.round((incurred / a.totalPremiumCents) * 100)
              : null,
          commissionExpectedCents: a.commissionExpectedCents,
          commissionReceivedCents: a.commissionReceivedCents,
          commissionVarianceCents:
            a.commissionExpectedCents - a.commissionReceivedCents,
          byLine: [...a.byLine.values()].sort(
            (x, y) => y.premiumCents - x.premiumCents,
          ),
        };
      })
      .sort((x, y) => y.totalPremiumCents - x.totalPremiumCents);
  });
}
