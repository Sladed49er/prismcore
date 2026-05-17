"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { currentActorName } from "@/lib/actor";
import {
  runStrategyAssistant,
  type StrategyAssistantResult,
} from "@/lib/strategy-assistant";

/**
 * One turn of the AI strategy assistant. Runs the autonomous tool loop and —
 * if it created any metric or rule — revalidates the Strategy Monitor so the
 * new KPIs and rules appear.
 */
export async function runStrategyAssistantTurn(
  messages: Anthropic.MessageParam[],
): Promise<StrategyAssistantResult> {
  const tenant = await getCurrentTenant();
  const actor = await currentActorName();
  const result = await runStrategyAssistant(tenant.id, actor, messages);
  if (result.created.length > 0) revalidatePath("/m/strategy");
  return result;
}
