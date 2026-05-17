"use client";

import { useMemo, useState } from "react";
import type { ComposableModule } from "@/lib/tenant";
import type { Bundle, AddOn } from "@/modules/bundles";
import { Composer } from "@/components/composer";
import { ModuleIcon } from "@/components/module-icon";

const STEPS = ["Business", "Add-ons", "Review"];

/**
 * The guided onboarding front door. Three steps — pick a business type (a bundle),
 * toggle a few cross-cutting add-ons, then review/adjust in the composer and create.
 * A non-technical owner never faces a wall of 36 modules.
 */
export function Onboarding({
  modules,
  bundles,
  addOns,
}: {
  modules: ComposableModule[];
  bundles: Bundle[];
  addOns: AddOn[];
}) {
  const [step, setStep] = useState(0);
  const [bundleId, setBundleId] = useState<string | null>(null);
  const [addOnIds, setAddOnIds] = useState<ReadonlySet<string>>(new Set());

  const bundle = bundles.find((b) => b.id === bundleId) ?? null;

  const recommended = useMemo(() => {
    const set = new Set<string>(bundle?.moduleIds ?? []);
    for (const a of addOns) {
      if (addOnIds.has(a.moduleId)) set.add(a.moduleId);
    }
    return [...set];
  }, [bundle, addOnIds, addOns]);

  function toggleAddOn(id: string): void {
    setAddOnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 text-sm">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                i === step
                  ? "bg-indigo-600 text-white"
                  : i < step
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={
                i === step ? "font-medium text-gray-900" : "text-gray-400"
              }
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? (
              <span className="mx-1 text-gray-300">→</span>
            ) : null}
          </div>
        ))}
      </div>

      {step === 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            What kind of business are you?
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            We will start you with a workspace that fits — you can change
            anything in the next steps.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {bundles.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBundleId(b.id)}
                className={`rounded-xl border p-5 text-left transition ${
                  bundleId === b.id
                    ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-200"
                    : "border-gray-200 hover:border-indigo-300"
                }`}
              >
                <ModuleIcon
                  name={b.icon}
                  className={`h-6 w-6 ${bundleId === b.id ? "text-indigo-600" : "text-gray-400"}`}
                />
                <h3 className="mt-3 font-semibold">{b.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{b.description}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {b.moduleIds.length} modules to start
                </p>
              </button>
            ))}
          </div>
          <div className="mt-6">
            <button
              type="button"
              disabled={!bundleId}
              onClick={() => setStep(1)}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Anything else you need?</h2>
          <p className="mt-1 text-sm text-gray-600">
            Optional. Turn on any of these, or skip and add them later.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {addOns.map((a) => {
              const on = addOnIds.has(a.moduleId);
              return (
                <button
                  key={a.moduleId}
                  type="button"
                  onClick={() => toggleAddOn(a.moduleId)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                    on
                      ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-200"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <ModuleIcon
                    name={a.icon}
                    className={`mt-0.5 h-5 w-5 ${on ? "text-indigo-600" : "text-gray-400"}`}
                  />
                  <span>
                    <span className="block font-medium">{a.question}</span>
                    <span className="mt-0.5 block text-sm text-gray-600">
                      {a.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-indigo-300"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="mt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Review your workspace</h2>
              <p className="mt-1 text-sm text-gray-600">
                Everything you picked is selected. Add or remove anything, then
                create.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
            >
              ← Back
            </button>
          </div>
          <Composer modules={modules} initialSelected={recommended} />
        </section>
      ) : null}
    </div>
  );
}
