"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createCrossSellOpportunity,
  setCrossSellStatus,
  deleteCrossSellOpportunity,
  type CrossSellStatus,
  type CrossSellConfidence,
} from "@/lib/cross-sell";
import { generateCrossSellOpportunities } from "@/lib/cross-sell-assistant";

const STATUSES: CrossSellStatus[] = [
  "suggested",
  "pursuing",
  "quoted",
  "won",
  "dismissed",
];
const CONFIDENCES: CrossSellConfidence[] = ["low", "medium", "high"];

/** Run the AI book analysis; returns a short summary line for the UI. */
export async function analyzeBook(): Promise<{
  ok: boolean;
  message: string;
}> {
  const tenant = await getCurrentTenant();
  const result = await generateCrossSellOpportunities(tenant.id);
  revalidatePath("/m/cross_sell");
  if (result.error) return { ok: false, message: result.error };
  if (result.analyzed === 0) {
    return {
      ok: true,
      message: "No clients with active policies to analyse yet.",
    };
  }
  return {
    ok: true,
    message: `Analysed ${result.analyzed} client${
      result.analyzed === 1 ? "" : "s"
    } — ${result.created} new opportunit${
      result.created === 1 ? "y" : "ies"
    } found.`,
  };
}

export async function newOpportunity(input: {
  clientId: string;
  clientName: string;
  line: string;
  rationale: string;
  estimatedPremiumDollars: string;
  confidence: string;
}): Promise<void> {
  if (!input.clientId || !input.line.trim()) return;
  const tenant = await getCurrentTenant();
  await createCrossSellOpportunity({
    tenantId: tenant.id,
    clientId: input.clientId,
    clientName: input.clientName,
    line: input.line.trim(),
    rationale: input.rationale.trim(),
    estimatedPremiumCents: Math.round(
      (Number.parseFloat(input.estimatedPremiumDollars) || 0) * 100,
    ),
    confidence: CONFIDENCES.includes(input.confidence as CrossSellConfidence)
      ? (input.confidence as CrossSellConfidence)
      : "medium",
  });
  revalidatePath("/m/cross_sell");
}

export async function updateOpportunityStatus(input: {
  id: string;
  status: CrossSellStatus;
}): Promise<void> {
  if (!STATUSES.includes(input.status)) return;
  const tenant = await getCurrentTenant();
  await setCrossSellStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/cross_sell");
}

export async function removeOpportunity(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteCrossSellOpportunity(tenant.id, id);
  revalidatePath("/m/cross_sell");
}
