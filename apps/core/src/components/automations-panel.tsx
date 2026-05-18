"use client";

import { useState, useTransition } from "react";
import {
  addRule,
  editRule,
  toggle,
  removeRule,
  runNow,
} from "@/app/(shell)/m/tasks/automations/actions";

export interface RuleDTO {
  id: string;
  name: string;
  triggerEvent: string;
  thresholdDays: number;
  actionType: string;
  actionConfig: {
    taskTitle?: string;
    emailTo?: string;
    emailSubject?: string;
  };
  enabled: boolean;
  fireCount: number;
}
export interface RunDTO {
  id: string;
  ruleName: string;
  entityType: string;
  summary: string;
  createdAt: string;
}
export interface TriggerDef {
  id: string;
  label: string;
  detail: string;
}
export interface ActionDef {
  id: string;
  label: string;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

interface Draft {
  name: string;
  triggerEvent: string;
  thresholdDays: number;
  actionType: string;
  taskTitle: string;
  emailTo: string;
  emailSubject: string;
}

export function AutomationsPanel({
  rules,
  runs,
  triggers,
  actions,
}: {
  rules: RuleDTO[];
  runs: RunDTO[];
  triggers: TriggerDef[];
  actions: ActionDef[];
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    name: "",
    triggerEvent: triggers[0]?.id ?? "policy_expiring",
    thresholdDays: 30,
    actionType: actions[0]?.id ?? "create_task",
    taskTitle: "",
    emailTo: "",
    emailSubject: "",
  });

  function startNew(): void {
    setEditId(null);
    setShowNew(true);
    setDraft({
      name: "",
      triggerEvent: triggers[0]?.id ?? "policy_expiring",
      thresholdDays: 30,
      actionType: actions[0]?.id ?? "create_task",
      taskTitle: "",
      emailTo: "",
      emailSubject: "",
    });
  }
  function startEdit(r: RuleDTO): void {
    setShowNew(false);
    setEditId(r.id);
    setDraft({
      name: r.name,
      triggerEvent: r.triggerEvent,
      thresholdDays: r.thresholdDays,
      actionType: r.actionType,
      taskTitle: r.actionConfig.taskTitle ?? "",
      emailTo: r.actionConfig.emailTo ?? "",
      emailSubject: r.actionConfig.emailSubject ?? "",
    });
  }
  function reset(): void {
    setEditId(null);
    setShowNew(false);
  }

  function save(): void {
    if (!draft.name.trim()) return;
    const payload = {
      name: draft.name,
      triggerEvent: draft.triggerEvent,
      thresholdDays: draft.thresholdDays,
      actionType: draft.actionType,
      actionConfig: {
        taskTitle: draft.taskTitle,
        emailTo: draft.emailTo,
        emailSubject: draft.emailSubject,
      },
    };
    startTransition(async () => {
      if (editId) await editRule({ id: editId, ...payload });
      else await addRule(payload);
      reset();
    });
  }

  function run(): void {
    setStatus(null);
    startTransition(async () => {
      const r = await runNow();
      setStatus(r.message);
    });
  }

  const triggerLabel = (id: string) =>
    triggers.find((t) => t.id === id)?.label ?? id;
  const actionLabel = (id: string) =>
    actions.find((a) => a.id === id)?.label ?? id;
  const editing = showNew || editId !== null;

  return (
    <div className="mt-6 space-y-7">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {rules.length} rule{rules.length === 1 ? "" : "s"}
        </p>
        <span className="flex gap-2">
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-40"
          >
            {pending ? "Running…" : "Run rules now"}
          </button>
          {!editing ? (
            <button
              type="button"
              onClick={startNew}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              + New rule
            </button>
          ) : null}
        </span>
      </div>

      {status ? (
        <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          {status}
        </p>
      ) : null}

      {editing ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Rule name
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              When — trigger
              <select
                value={draft.triggerEvent}
                onChange={(e) =>
                  setDraft({ ...draft, triggerEvent: e.target.value })
                }
                className={inputClass}
              >
                {triggers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Threshold (days)
              <input
                type="number"
                min={0}
                value={draft.thresholdDays}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholdDays: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Then — action
              <select
                value={draft.actionType}
                onChange={(e) =>
                  setDraft({ ...draft, actionType: e.target.value })
                }
                className={inputClass}
              >
                {actions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            {draft.actionType === "create_task" ? (
              <label className={`${labelClass} sm:col-span-2`}>
                Task title (the matched record is added as the description)
                <input
                  value={draft.taskTitle}
                  onChange={(e) =>
                    setDraft({ ...draft, taskTitle: e.target.value })
                  }
                  placeholder="defaults to the rule name"
                  className={inputClass}
                />
              </label>
            ) : (
              <>
                <label className={labelClass}>
                  Email to
                  <input
                    value={draft.emailTo}
                    onChange={(e) =>
                      setDraft({ ...draft, emailTo: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  Email subject
                  <input
                    value={draft.emailSubject}
                    onChange={(e) =>
                      setDraft({ ...draft, emailSubject: e.target.value })
                    }
                    placeholder="defaults to the rule name"
                    className={inputClass}
                  />
                </label>
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {triggers.find((t) => t.id === draft.triggerEvent)?.detail}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !draft.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save rule"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* Rules */}
      <section>
        <div className="space-y-2">
          {rules.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
              No automation rules yet.
            </p>
          ) : (
            rules.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3"
              >
                <span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.enabled
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {r.enabled ? "on" : "off"}
                    </span>
                    <span className="font-medium">{r.name}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    When {triggerLabel(r.triggerEvent).toLowerCase()} (
                    {r.thresholdDays}d) → {actionLabel(r.actionType)} · fired{" "}
                    {r.fireCount}×
                  </span>
                </span>
                <span className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await toggle(r.id, !r.enabled);
                      })
                    }
                    disabled={pending}
                    className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
                  >
                    {r.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(r)}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await removeRule(r.id);
                      })
                    }
                    disabled={pending}
                    className="text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Run log */}
      {runs.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recent fires
          </h2>
          <div className="mt-2 space-y-1">
            {runs.map((run) => (
              <p key={run.id} className="text-xs text-gray-500">
                {new Date(run.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}{" "}
                · <span className="font-medium">{run.ruleName}</span> —{" "}
                {run.summary}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
