"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { loadCurrentTenant } from "@/lib/kernel";
import {
  runAssistant,
  type AssistantContext,
  type AssistantResult,
} from "@/lib/assistant";

/**
 * One turn of the customization assistant. The client passes the full Anthropic
 * message history (with the new user message already appended); this resolves
 * the tenant + its customizable surface, runs the autonomous tool loop, and —
 * if anything changed — revalidates the hub so the new state shows.
 */
export async function runAssistantTurn(
  messages: Anthropic.MessageParam[],
): Promise<AssistantResult> {
  const { config, modules } = await loadCurrentTenant();

  const ctx: AssistantContext = {
    modules: modules.map((m) => ({ id: m.id, name: m.name })),
    entities: modules.flatMap((m) =>
      (m.customizableEntities ?? []).map((e) => ({
        moduleId: m.id,
        moduleName: m.name,
        entityKey: e.key,
        label: e.label,
      })),
    ),
  };

  const result = await runAssistant(config.id, ctx, messages);

  if (result.changes.length > 0) {
    revalidatePath("/settings/customize");
    revalidatePath("/", "layout");
  }
  return result;
}
