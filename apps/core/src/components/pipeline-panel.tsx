"use client";

import { useState, useTransition } from "react";
import {
  addOpportunity,
  advanceStage,
} from "@/app/(shell)/m/pipeline/opportunities/actions";

export interface OpportunityDTO {
  id: string;
  name: string;
  clientName: string;
  valueCents: number;
  stage: string;
  expectedCloseDate: string | null;
}

export interface ClientOption {
  id: string;
  name: string;
}

const STAGES = ["new", "contacted", "quoted", "won", "lost"] as const;
type Stage = (typeof STAGES)[number];

const STYLE: Record<string, string> = {
  new: "bg-gray-100 text-gray-500",
  contacted: "bg-blue-50 text-blue-700",
  quoted: "bg-amber-50 text-amber-700",
  won: "bg-green-50 text-green-700",
  lost: "bg-red-50 text-red-700",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY = {
  name: "",
  stage: "new",
  valueDollars: "",
  notes: "",
  expectedCloseDate: "",
};

export function PipelinePanel({
  opportunities,
  clients,
}: {
  opportunities: OpportunityDTO[];
  clients: ClientOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState("");
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await addOpportunity({
        clientId,
        name: form.name,
        stage: form.stage as Stage,
        valueDollars: form.valueDollars,
        notes: form.notes,
        expectedCloseDate: form.expectedCloseDate,
      });
      setForm({ ...EMPTY });
      setClientId("");
      setShowForm(false);
    });
  }

  function changeStage(id: string, stage: Stage): void {
    startTransition(async () => {
      await advanceStage(id, stage);
    });
  }

  const open = opportunities
    .filter((o) => o.stage !== "won" && o.stage !== "lost")
    .reduce((sum, o) => sum + o.valueCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {opportunities.length} opportunit
          {opportunities.length === 1 ? "y" : "ies"} · {money(open)} in play
        </p>
        {!showForm && clients.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New opportunity
          </button>
        ) : null}
      </div>

      {clients.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add a client first — pipeline opportunities are tied to a client.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Client
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
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
            <label className={`${labelClass} sm:col-span-2`}>
              Opportunity
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Commercial package — new business"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Stage
              <select
                value={form.stage}
                onChange={(e) => set("stage", e.target.value)}
                className={inputClass}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Estimated value ($)
              <input
                type="number"
                value={form.valueDollars}
                onChange={(e) => set("valueDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Expected close
              <input
                type="date"
                value={form.expectedCloseDate}
                onChange={(e) => set("expectedCloseDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Notes
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !clientId || !form.name.trim()}
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
            No opportunities yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Opportunity</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Value</th>
                <th className="px-4 py-3 font-semibold">Close</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {opportunities.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium">{o.name}</td>
                  <td className="px-4 py-3 text-gray-600">{o.clientName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(o.valueCents)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {o.expectedCloseDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={o.stage}
                      onChange={(e) =>
                        changeStage(o.id, e.target.value as Stage)
                      }
                      disabled={pending}
                      aria-label="Pipeline stage"
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STYLE[o.stage] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
