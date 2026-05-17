"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  runReportAssistant,
  type ReportAssistantResult,
} from "@/lib/report-assistant";

/**
 * One turn of the AI report builder. The client passes the full Anthropic
 * message history (new user message appended); this resolves the tenant, runs
 * the autonomous tool loop, and — if the assistant saved any report —
 * revalidates the Reports page so it appears there.
 */
export async function runReportAssistantTurn(
  messages: Anthropic.MessageParam[],
): Promise<ReportAssistantResult> {
  const tenant = await getCurrentTenant();
  const result = await runReportAssistant(tenant.id, messages);
  if (result.saved.length > 0) revalidatePath("/m/reports");
  return result;
}
