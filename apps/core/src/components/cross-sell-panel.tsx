"use client";

import { useState, useTransition } from "react";
import {
  analyzeBook,
  newOpportunity,
  updateOpportunityStatus,
  removeOpportunity,
} from "@/app/(shell)/m/cross_sell/actions";

export interface CrossSellOpportunityDTO {
  id: string;
  clientName: string;
  line: string;
  rationale: string;
  estimatedPremiumCents: number;
  confidence: "low" | "medium" | "high";
  status: "suggested" | "pursuing" | "quoted" | "won" | "dismissed";
  source: "ai" | "manual";
}

export interface ClientOption {
  id: string;
  name: string;
}

const STATUSES = [
  "suggested",
  "pursuing",
  "quoted",
  "won",
  "dismissed",
] as const;
const CONFIDENCES = ["low", "medium", "high"] as const;

const STATUS_COLOR: Record<CrossSellOpportunityDTO["status"], string> = {
  suggested: "bg-gray-100 text-gray-600",
  pursuing: "bg-blue-50 text-blue-700",
  quoted: "bg-amber-50 text-amber-700",
  won: "bg-emerald-50 text-emerald-700",
  dismissed: "bg-rose-50 text-rose-700",
};

const CONFIDENCE_COLOR: Record<
  CrossSellOpportunityDTO["confidence"],
  string
> = {
  low: "text-gray-400",
  medium: "text-amber-600",
  high: "text-emerald-600",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  clientId: "",
  line: "",
  rationale: "",
  estimatedPremiumDollars: "",
  confidence: "medium",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function CrossSellPanel({
  opportunities,
  clients,
}: {
  opportunities: CrossSellOpportunityDTO[];
  clients: ClientOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [notice, setNotice] = useState<string | null>(null);

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function analyze(): void {
    setNotice(null);
    startTransition(async () => {
      const result = await analyzeBook();
      setNotice(result.message);
    });
  }

  function submit(): void {
    const client = clients.find((c) => c.id === form.clientId);
    if (!client) return;
    startTransition(async () => {
      await newOpportunity({
        clientId: form.clientId,
        clientName: client.name,
        line: form.line,
        rationale: form.rationale,
        estimatedPremiumDollars: form.estimatedPremiumDollars,
        confidence: form.confidence,
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: CrossSellOpportunityDTO["status"],
  ): void {
    startTransition(async () => {
      await updateOpportunityStatus({ id, status });
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this opportunity?")) return;
    startTransition(async () => {
      await removeOpportunity(id);
    });
  }

  const open = opportunities.filter(
    (o) => o.status !== "won" && o.status !== "dismissed",
  );
  const openValue = open.reduce((s, o) => s + o.estimatedPremiumCents, 0);
  const wonValue = opportunities
    .filter((o) => o.status === "won")
    .reduce((s, o) => s + o.estimatedPremiumCents, 0);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {open.length} open · {money(openValue)} estimated premium
          {wonValue > 0 ? (
            <span className="text-emerald-700">
              {" "}
              · {money(wonValue)} won
            </span>
          ) : null}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={analyze}
            disabled={pending}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
          >
            {pending ? "Working…" : "✨ Analyze book with AI"}
          </button>
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              + Add manually
            </button>
          ) : null}
        </div>
      </div>

      {notice ? (
        <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          {notice}
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Client
              <select
                value={form.clientId}
                onChange={(e) => set("clientId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Line of business
              <input
                value={form.line}
                onChange={(e) => set("line", e.target.value)}
                placeholder="e.g. Umbrella"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Estimated annual premium ($)
              <input
                type="number"
                value={form.estimatedPremiumDollars}
                onChange={(e) =>
                  set("estimatedPremiumDollars", e.target.value)
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Confidence
              <select
                value={form.confidence}
                onChange={(e) => set("confidence", e.target.value)}
                className={inputClass}
              >
                {CONFIDENCES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Rationale
              <input
                value={form.rationale}
                onChange={(e) => set("rationale", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.clientId || !form.line.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save opportunity"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {opportunities.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No cross-sell opportunities yet — run the AI book analysis or add
            one manually.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Line</th>
                <th className="px-4 py-3 font-semibold">Est. premium</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {opportunities.map((o) => (
                <tr key={o.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{o.clientName}</span>
                    {o.source === "ai" ? (
                      <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-600">
                        AI
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{o.line}</span>
                    {o.rationale ? (
                      <span className="block text-xs text-gray-500">
                        {o.rationale}
                      </span>
                    ) : null}
                    <span
                      className={`text-xs font-semibold ${CONFIDENCE_COLOR[o.confidence]}`}
                    >
                      {o.confidence} confidence
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {o.estimatedPremiumCents
                      ? money(o.estimatedPremiumCents)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={o.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          o.id,
                          e.target.value as CrossSellOpportunityDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[o.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(o.id)}
                      disabled={pending}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
