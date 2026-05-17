import Anthropic from "@anthropic-ai/sdk";
import {
  listCustomFields,
  addCustomField,
  removeCustomField,
  listTerminology,
  setTerm,
  clearTerm,
  listOptionSets,
  createOptionSet,
  addOptionItem,
  getBranding,
  setBranding,
  logCustomization,
} from "@/lib/customization";

/**
 * The AI customization assistant.
 *
 * It is FULLY AUTONOMOUS — it applies customizations directly, no confirm
 * step. The safeguard is structural: its entire toolbox is the customization
 * API below, which is itself RLS-bound to one tenant. The assistant therefore
 * cannot reach code, the platform, or another tenant no matter what it is
 * asked. Every change it makes is written to `tenant_customization_log` with
 * `actor_type = 'ai'`, so an autonomous change is always visible and revertible.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_TOOL_ROUNDS = 12;

/** Module + entity context the assistant needs to target custom fields. */
export interface AssistantContext {
  modules: { id: string; name: string }[];
  entities: {
    moduleId: string;
    moduleName: string;
    entityKey: string;
    label: string;
  }[];
}

export interface AssistantResult {
  /** The full Anthropic message history, to round-trip back on the next turn. */
  messages: Anthropic.MessageParam[];
  /** One line per customization the assistant applied this turn. */
  changes: string[];
  /** The assistant's final reply text. */
  reply: string;
  error?: string;
}

const SYSTEM_PROMPT = `You are the customization assistant for Prism Core, a multi-tenant platform for independent insurance agencies. You help one agency reshape ITS OWN workspace through plain conversation.

You are AUTONOMOUS: when the user asks for a change, apply it directly with your tools — do not ask for confirmation. Every change is isolated to this tenant and is logged and reversible, so it is safe to act.

What you can do:
- Add or remove custom fields on any record type.
- Rename modules and record types to the agency's own words (terminology).
- Create picklists (option sets) and add coloured options to them.
- Set the workspace branding: name, accent colour (hex), logo URL.

Working method:
- Call get_workspace_state FIRST whenever you need current ids, the exact term keys, or what already exists. Never guess an id or a term key.
- When a request implies several changes, make them all.
- After acting, reply in 1-3 short sentences describing what you did. Be concrete.
- If a request is outside customization (e.g. changing business logic, code, billing, or anything for a different agency), explain you can only customize this workspace and cannot do that.
- Accent colours must be hex like #2563eb.`;

/* ── Tool schemas ────────────────────────────────────────────────────────── */

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_workspace_state",
    description:
      "Return the current customization state: customizable record types (with their moduleId/entityKey), existing custom fields, terminology overrides and the keys available to rename, option sets, and branding. Call this before acting when you need ids or exact keys.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "add_custom_field",
    description: "Add a custom field to a record type.",
    input_schema: {
      type: "object",
      properties: {
        moduleId: { type: "string" },
        entityKey: { type: "string" },
        label: { type: "string" },
        fieldType: {
          type: "string",
          enum: ["text", "number", "date", "select", "checkbox"],
        },
        required: { type: "boolean" },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Choices, only for a select field.",
        },
      },
      required: ["moduleId", "entityKey", "label", "fieldType", "required"],
    },
  },
  {
    name: "remove_custom_field",
    description: "Delete a custom field by its id.",
    input_schema: {
      type: "object",
      properties: { fieldId: { type: "string" } },
      required: ["fieldId"],
    },
  },
  {
    name: "rename",
    description:
      "Rename a module or record type. termKey comes from get_workspace_state (e.g. module:clients or entity:client).",
    input_schema: {
      type: "object",
      properties: {
        termKey: { type: "string" },
        label: { type: "string" },
      },
      required: ["termKey", "label"],
    },
  },
  {
    name: "reset_name",
    description: "Remove a rename, reverting a module or record type to its default name.",
    input_schema: {
      type: "object",
      properties: { termKey: { type: "string" } },
      required: ["termKey"],
    },
  },
  {
    name: "create_picklist",
    description:
      "Create a named option set (picklist). Returns its optionSetId. A setKey beginning with 'core:' restyles a built-in status field.",
    input_schema: {
      type: "object",
      properties: {
        setKey: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
      },
      required: ["setKey", "name"],
    },
  },
  {
    name: "add_picklist_option",
    description: "Add an option to an existing picklist (by optionSetId).",
    input_schema: {
      type: "object",
      properties: {
        optionSetId: { type: "string" },
        label: { type: "string" },
        color: {
          type: "string",
          enum: [
            "gray",
            "green",
            "amber",
            "red",
            "blue",
            "indigo",
            "purple",
            "pink",
          ],
        },
      },
      required: ["optionSetId", "label"],
    },
  },
  {
    name: "set_branding",
    description:
      "Set the workspace branding. Any field omitted is left unchanged.",
    input_schema: {
      type: "object",
      properties: {
        workspaceName: { type: "string" },
        accentColor: { type: "string", description: "Hex, e.g. #2563eb" },
        logoUrl: { type: "string" },
      },
    },
  },
];

/* ── Tool execution ──────────────────────────────────────────────────────── */

interface ToolOutcome {
  result: unknown;
  /** Human-readable summary if this call changed something. */
  change?: string;
}

async function executeTool(
  tenantId: string,
  ctx: AssistantContext,
  name: string,
  input: Record<string, unknown>,
): Promise<ToolOutcome> {
  switch (name) {
    case "get_workspace_state": {
      const [fields, terms, optionSets, branding] = await Promise.all([
        listCustomFields(tenantId),
        listTerminology(tenantId),
        listOptionSets(tenantId),
        getBranding(tenantId),
      ]);
      const overrides = new Map(terms.map((t) => [t.termKey, t.label]));
      return {
        result: {
          recordTypes: ctx.entities,
          renameableKeys: [
            ...ctx.modules.map((m) => ({
              termKey: `module:${m.id}`,
              defaultLabel: m.name,
              currentLabel: overrides.get(`module:${m.id}`) ?? null,
            })),
            ...ctx.entities.map((e) => ({
              termKey: `entity:${e.entityKey}`,
              defaultLabel: e.label,
              currentLabel: overrides.get(`entity:${e.entityKey}`) ?? null,
            })),
          ],
          customFields: fields.map((f) => ({
            id: f.id,
            entityKey: f.entityKey,
            label: f.label,
            fieldType: f.fieldType,
          })),
          optionSets: optionSets.map((s) => ({
            optionSetId: s.set.id,
            setKey: s.set.setKey,
            name: s.set.name,
            options: s.items.map((i) => ({ label: i.label, color: i.color })),
          })),
          branding: {
            workspaceName: branding?.workspaceName ?? null,
            accentColor: branding?.accentColor ?? "#4f46e5",
            logoUrl: branding?.logoUrl ?? null,
          },
        },
      };
    }
    case "add_custom_field": {
      const id = await addCustomField({
        tenantId,
        moduleId: String(input.moduleId),
        entityKey: String(input.entityKey),
        label: String(input.label),
        fieldType: input.fieldType as
          | "text"
          | "number"
          | "date"
          | "select"
          | "checkbox",
        required: Boolean(input.required),
        options: Array.isArray(input.options)
          ? (input.options as string[])
          : undefined,
      });
      return {
        result: { fieldId: id },
        change: `Added the "${input.label}" field to ${input.entityKey}`,
      };
    }
    case "remove_custom_field": {
      await removeCustomField(tenantId, String(input.fieldId));
      return { result: { ok: true }, change: "Removed a custom field" };
    }
    case "rename": {
      await setTerm(tenantId, String(input.termKey), String(input.label));
      return {
        result: { ok: true },
        change: `Renamed ${input.termKey} to "${input.label}"`,
      };
    }
    case "reset_name": {
      await clearTerm(tenantId, String(input.termKey));
      return {
        result: { ok: true },
        change: `Reset ${input.termKey} to its default name`,
      };
    }
    case "create_picklist": {
      const id = await createOptionSet(tenantId, {
        setKey: String(input.setKey),
        name: String(input.name),
        description: input.description ? String(input.description) : undefined,
      });
      return {
        result: { optionSetId: id },
        change: `Created the "${input.name}" picklist`,
      };
    }
    case "add_picklist_option": {
      await addOptionItem(tenantId, {
        optionSetId: String(input.optionSetId),
        value: "",
        label: String(input.label),
        color: input.color ? String(input.color) : "gray",
      });
      return {
        result: { ok: true },
        change: `Added the "${input.label}" option`,
      };
    }
    case "set_branding": {
      await setBranding(tenantId, {
        ...(input.workspaceName !== undefined
          ? { workspaceName: String(input.workspaceName) }
          : {}),
        ...(input.accentColor !== undefined
          ? { accentColor: String(input.accentColor) }
          : {}),
        ...(input.logoUrl !== undefined
          ? { logoUrl: String(input.logoUrl) }
          : {}),
      });
      return { result: { ok: true }, change: "Updated the workspace branding" };
    }
    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}

/* ── Agent loop ──────────────────────────────────────────────────────────── */

/**
 * Run one assistant turn: the user's latest message has already been pushed
 * onto `messages`. Drives the Claude tool-use loop to completion, applying
 * every customization the model calls for, and returns the updated history.
 */
export async function runAssistant(
  tenantId: string,
  ctx: AssistantContext,
  messages: Anthropic.MessageParam[],
): Promise<AssistantResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      messages,
      changes: [],
      reply: "",
      error: "The AI assistant is not configured (no ANTHROPIC_API_KEY).",
    };
  }

  const client = new Anthropic({ apiKey });
  const history = [...messages];
  const changes: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: history,
    });

    history.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const reply = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { messages: history, changes, reply };
    }

    // Execute every tool the model called, collect the results.
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      try {
        const outcome = await executeTool(
          tenantId,
          ctx,
          block.name,
          (block.input ?? {}) as Record<string, unknown>,
        );
        if (outcome.change) {
          changes.push(outcome.change);
          await logCustomization(tenantId, {
            actorType: "ai",
            actorName: "AI assistant",
            action: `ai.${block.name}`,
            summary: outcome.change,
          });
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(outcome.result),
        });
      } catch (error) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          is_error: true,
          content:
            error instanceof Error ? error.message : "Tool execution failed",
        });
      }
    }
    history.push({ role: "user", content: toolResults });
  }

  return {
    messages: history,
    changes,
    reply:
      "I made several changes but stopped before finishing — ask me to continue.",
    error: "tool-round limit reached",
  };
}
