import { and, desc, eq, ne } from "drizzle-orm";
import {
  withTenantContext,
  crossSellOpportunities,
  type CrossSellOpportunity,
} from "@prismcore/db";

/**
 * Cross-sell data layer — recommended lines of business for existing clients.
 * RLS-scoped through `withTenantContext`. The AI book analysis lives in
 * `cross-sell-assistant.ts`; this file is pure data access.
 */

export type { CrossSellOpportunity };

export type CrossSellStatus =
  | "suggested"
  | "pursuing"
  | "quoted"
  | "won"
  | "dismissed";

export type CrossSellConfidence = "low" | "medium" | "high";

export async function listCrossSellOpportunities(
  tenantId: string,
): Promise<CrossSellOpportunity[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(crossSellOpportunities)
      .where(eq(crossSellOpportunities.tenantId, tenantId))
      .orderBy(desc(crossSellOpportunities.createdAt)),
  );
}

export async function createCrossSellOpportunity(input: {
  tenantId: string;
  clientId: string;
  clientName: string;
  line: string;
  rationale: string;
  estimatedPremiumCents: number;
  confidence: CrossSellConfidence;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(crossSellOpportunities).values({
      ...input,
      source: "manual",
      status: "suggested",
    });
  });
}

/** Insert a batch of AI-generated opportunities. */
export async function insertAiOpportunities(
  tenantId: string,
  rows: {
    clientId: string;
    clientName: string;
    line: string;
    rationale: string;
    estimatedPremiumCents: number;
    confidence: CrossSellConfidence;
  }[],
): Promise<void> {
  if (rows.length === 0) return;
  await withTenantContext(tenantId, async (tx) => {
    await tx.insert(crossSellOpportunities).values(
      rows.map((r) => ({
        tenantId,
        ...r,
        source: "ai" as const,
        status: "suggested" as const,
      })),
    );
  });
}

/** Active (non-dismissed) opportunities, as clientId→Set(line) — for dedupe. */
export async function existingOpportunityKeys(
  tenantId: string,
): Promise<Set<string>> {
  const rows = await withTenantContext(tenantId, async (tx) =>
    tx
      .select({
        clientId: crossSellOpportunities.clientId,
        line: crossSellOpportunities.line,
      })
      .from(crossSellOpportunities)
      .where(
        and(
          eq(crossSellOpportunities.tenantId, tenantId),
          ne(crossSellOpportunities.status, "dismissed"),
        ),
      ),
  );
  return new Set(rows.map((r) => `${r.clientId}::${r.line.toLowerCase()}`));
}

export async function setCrossSellStatus(input: {
  tenantId: string;
  id: string;
  status: CrossSellStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(crossSellOpportunities)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(crossSellOpportunities.id, input.id));
  });
}

export async function deleteCrossSellOpportunity(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(crossSellOpportunities)
      .where(eq(crossSellOpportunities.id, id));
  });
}
