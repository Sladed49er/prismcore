"use client";

import { useState, useTransition } from "react";
import type { TermItemDTO } from "@/components/customize-hub";
import { saveTerm, resetTerm } from "@/app/(shell)/settings/customize/actions";

const KINDS: TermItemDTO["kind"][] = ["Module", "Record"];

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";

/**
 * The terminology panel: rename modules and records to the tenant's own
 * vocabulary. Each row carries a default name, an editable label, and — once
 * overridden — a reset control. No code; pure self-service.
 */
export function TerminologyPanel({ items }: { items: TermItemDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      items.map((i) => [i.termKey, i.currentLabel ?? i.defaultLabel]),
    ),
  );

  function setLabel(termKey: string, value: string): void {
    setLabels((l) => ({ ...l, [termKey]: value }));
  }

  function save(item: TermItemDTO): void {
    const value = (labels[item.termKey] ?? "").trim();
    if (!value) return;
    startTransition(async () => {
      await saveTerm(item.termKey, value);
    });
  }

  function reset(item: TermItemDTO): void {
    startTransition(async () => {
      await resetTerm(item.termKey);
      setLabel(item.termKey, item.defaultLabel);
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {KINDS.map((kind) => {
        const group = items.filter((i) => i.kind === kind);
        if (group.length === 0) return null;
        return (
          <div key={kind}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {kind === "Module" ? "Modules" : "Records"}
            </p>
            <div className="mt-2 rounded-xl border border-gray-200 bg-white">
              <ul className="divide-y divide-gray-100">
                {group.map((item) => (
                  <li
                    key={item.termKey}
                    className="flex flex-wrap items-end gap-3 px-5 py-3"
                  >
                    <div className="min-w-48 flex-1">
                      <span className="text-xs text-gray-400">
                        Default: {item.defaultLabel}
                      </span>
                      <input
                        value={labels[item.termKey] ?? ""}
                        onChange={(e) =>
                          setLabel(item.termKey, e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    {item.currentLabel ? (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        renamed
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => save(item)}
                      disabled={pending || !(labels[item.termKey] ?? "").trim()}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Save
                    </button>
                    {item.currentLabel ? (
                      <button
                        type="button"
                        onClick={() => reset(item)}
                        disabled={pending}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-gray-400 disabled:opacity-40"
                      >
                        Reset
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
