"use client";

import { useState, useTransition } from "react";
import { addRenewal, advanceStage } from "@/app/(shell)/m/renewals/pipeline/actions";

export interface RenewalDTO {
  id: string;
  policyNumber: string;
  clientName: string;
  lineOfBusiness: string;
  carrier: string;
  dueDate: string | null;
  stage: string;
  notes: string;
}

export interface PolicyOption {
  id: string;
  label: string;
}

const STAGES = [
  "not_started",
  "in_progress",
  "quoted",
  "renewed",
  "lost",
] as const;
type Stage = (typeof STAGES)[number];

const STAGE_STYLE: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-500",
  in_progress: "bg-amber-50 text-amber-700",
  quoted: "bg-blue-50 text-blue-700",
  renewed: "bg-green-50 text-green-700",
  lost: "bg-red-50 text-red-700",
};

function stageLabel(s: string): string {
  return s.replace("_", " ");
}

export function RenewalsPanel({
  renewals,
  policies,
}: {
  renewals: RenewalDTO[];
  policies: PolicyOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [policyId, setPolicyId] = useState("");
  const [stage, setStage] = useState<Stage>("not_started");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  function submit(): void {
    startTransition(async () => {
      await addRenewal({ policyId, stage, dueDate, notes });
      setPolicyId("");
      setStage("not_started");
      setDueDate("");
      setNotes("");
      setShowForm(false);
    });
  }

  function changeStage(id: string, next: Stage): void {
    startTransition(async () => {
      await advanceStage(id, next);
    });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {renewals.length} renewal{renewals.length === 1 ? "" : "s"} on the
          worklist
        </p>
        {!showForm && policies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Start a renewal
          </button>
        ) : null}
      </div>

      {policies.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add a policy first — a renewal tracks a policy toward its expiration.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Policy
              <select
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a policy…</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Stage
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as Stage)}
                className={inputClass}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {stageLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !policyId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Add to worklist"}
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
        {renewals.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No renewals on the worklist yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Policy</th>
                <th className="px-4 py-3 font-semibold">Insured</th>
                <th className="px-4 py-3 font-semibold">Line</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {renewals.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.policyNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{r.clientName}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.lineOfBusiness}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.dueDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.stage}
                      onChange={(e) =>
                        changeStage(r.id, e.target.value as Stage)
                      }
                      disabled={pending}
                      aria-label="Renewal stage"
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STAGE_STYLE[r.stage] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {stageLabel(s)}
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
