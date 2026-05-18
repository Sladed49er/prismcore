"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  scanRecentCalls,
  setInsightStatus,
  setFlagStatus,
  type AnalyzeResult,
} from "@/lib/voip-intelligence";
import { computeRiskRadar, type RiskAssessment } from "@/lib/voip-risk";
import { generateWeeklyDigest, type DigestResult } from "@/lib/voip-digest";
import { generateCallerBrief, type CallerBrief } from "@/lib/voip-caller-brief";

const PATH = "/m/telephony/intelligence";

/** Analyse every not-yet-analysed call for revenue insights + compliance. */
export async function scanCalls(): Promise<AnalyzeResult> {
  const tenant = await getCurrentTenant();
  const result = await scanRecentCalls(tenant.id);
  revalidatePath(PATH);
  return result;
}

/** Compute the client risk radar, with AI sentiment on the top accounts. */
export async function runRiskRadar(): Promise<RiskAssessment[]> {
  const tenant = await getCurrentTenant();
  return computeRiskRadar(tenant.id, true);
}

/** Build a pre-call brief for one matched contact. */
export async function callerBrief(
  contactId: string,
): Promise<CallerBrief | null> {
  const tenant = await getCurrentTenant();
  return generateCallerBrief(tenant.id, contactId);
}

/** Generate and store this week's call digest. */
export async function generateDigest(): Promise<DigestResult> {
  const tenant = await getCurrentTenant();
  const result = await generateWeeklyDigest(tenant.id);
  revalidatePath(PATH);
  return result;
}

/** Move a revenue insight to actioned / dismissed / open. */
export async function updateInsight(
  id: string,
  status: "open" | "actioned" | "dismissed",
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setInsightStatus(tenant.id, id, status);
  revalidatePath(PATH);
}

/** Resolve or reopen a compliance flag. */
export async function resolveFlag(
  id: string,
  status: "open" | "resolved",
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setFlagStatus(tenant.id, id, status);
  revalidatePath(PATH);
}
