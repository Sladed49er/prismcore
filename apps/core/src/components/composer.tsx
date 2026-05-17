"use client";

import { useMemo, useState, useTransition } from "react";
import type { ComposableModule } from "@/lib/tenant";
import { ModuleIcon } from "@/components/module-icon";
import { createWorkspace } from "@/app/compose/actions";

const CATEGORY_ORDER = [
  "core",
  "insurance",
  "accounting",
  "communications",
  "wealth",
  "association",
  "integration",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core",
  insurance: "Insurance",
  accounting: "Accounting",
  communications: "Communications",
  wealth: "Wealth & Financial",
  association: "Association",
  integration: "Integrations",
};

function priceLabel(cents: number | null, unit: string | null): string {
  if (cents === null || cents === 0) return "Included";
  const per =
    unit === "per_user" ? "user" : unit === "per_tenant" ? "agency" : "use";
  return `$${(cents / 100).toFixed(0)} / ${per} / mo`;
}

/** Expand a selection to include every dependency, transitively. */
function withDependencies(
  picked: ReadonlySet<string>,
  byId: Map<string, ComposableModule>,
): Set<string> {
  const out = new Set(picked);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...out]) {
      for (const dep of byId.get(id)?.dependsOn ?? []) {
        if (!out.has(dep)) {
          out.add(dep);
          changed = true;
        }
      }
    }
  }
  return out;
}

/**
 * The composer onboarding. Pick the modules an agency needs; dependencies are
 * pulled in automatically and pricing updates live. "Software your way."
 */
export function Composer({ modules }: { modules: ComposableModule[] }) {
  const byId = useMemo(
    () => new Map(modules.map((m) => [m.id, m])),
    [modules],
  );
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const effective = useMemo(
    () => withDependencies(picked, byId),
    [picked, byId],
  );
  const total = useMemo(
    () =>
      [...effective].reduce(
        (sum, id) => sum + (byId.get(id)?.priceCents ?? 0),
        0,
      ),
    [effective, byId],
  );
  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => ({
        cat,
        label: CATEGORY_LABELS[cat] ?? cat,
        mods: modules.filter((m) => m.category === cat),
      })).filter((g) => g.mods.length > 0),
    [modules],
  );

  function toggle(id: string): void {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit(): void {
    startTransition(() => {
      void createWorkspace(name, [...effective]);
    });
  }

  return (
    <div className="mt-8 pb-28">
      {groups.map((group) => (
        <section key={group.cat} className="mt-10 first:mt-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {group.label}
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.mods.map((m) => {
              const selected = effective.has(m.id);
              const auto = selected && !picked.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={`rounded-xl border p-5 text-left transition ${
                    selected
                      ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-200"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <ModuleIcon
                      name={m.icon}
                      className={`h-5 w-5 ${selected ? "text-indigo-600" : "text-gray-400"}`}
                    />
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
                        selected
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-gray-300 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold">{m.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">{m.description}</p>
                  <p className="mt-3 text-sm font-medium text-gray-900">
                    {priceLabel(m.priceCents, m.priceUnit)}
                  </p>
                  {auto ? (
                    <p className="mt-1 text-xs text-indigo-500">
                      added automatically — required by another module
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Agency name"
            aria-label="Agency name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 sm:max-w-xs"
          />
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {effective.size} module{effective.size === 1 ? "" : "s"}
              </p>
              <p className="text-xl font-semibold">
                ${(total / 100).toFixed(0)}
                <span className="text-sm font-normal text-gray-500"> / mo</span>
              </p>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={effective.size === 0 || pending}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
