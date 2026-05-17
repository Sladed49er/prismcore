"use client";

import { useState, useTransition } from "react";
import {
  newContingencyIncome,
  updateContingencyStatus,
} from "@/app/(shell)/m/commissions/contingency/actions";

export interface ContingencyDTO {
  id: string;
  carrierName: string;
  year: string;
  incomeType: "contingency" | "profit_share" | "bonus" | "growth";
  expectedCents: number;
  receivedCents: number;
  status: "projected" | "received" | "closed";
}

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const TYPE_LABEL: Record<ContingencyDTO["incomeType"], string> = {
  contingency: "Contingency",
  profit_share: "Profit share",
  bonus: "Bonus",
  growth: "Growth",
};

const STATUS_COLOR: Record<ContingencyDTO["status"], string> = {
  projected: "bg-amber-50 text-amber-700",
  received: "bg-emerald-50 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
};

const EMPTY = {
  carrierName: "",
  year: String(new Date().getFullYear()),
  incomeType: "contingency",
  expectedDollars: "",
  receivedDollars: "",
  notes: "",
};

export function ContingencyPanel({
  income,
}: {
  income: ContingencyDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newContingencyIncome({
        ...form,
        incomeType: form.incomeType as ContingencyDTO["incomeType"],
      });
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: ContingencyDTO["status"]): void {
    startTransition(async () => {
      await updateContingencyStatus({ id, status });
    });
  }

  const projected = income
    .filter((i) => i.status === "projected")
    .reduce((s, i) => s + i.expectedCents, 0);
  const received = income.reduce((s, i) => s + i.receivedCents, 0);
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {income.length} record{income.length === 1 ? "" : "s"} ·{" "}
          {money(projected)} projected · {money(received)} received
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New record
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Carrier
              <input
                value={form.carrierName}
                onChange={(e) => set("carrierName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Income type
              <select
                value={form.incomeType}
                onChange={(e) => set("incomeType", e.target.value)}
                className={inputClass}
              >
                <option value="contingency">Contingency</option>
                <option value="profit_share">Profit share</option>
                <option value="bonus">Bonus</option>
                <option value="growth">Growth</option>
              </select>
            </label>
            <label className={labelClass}>
              Year
              <input
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Expected ($)
              <input
                type="number"
                value={form.expectedDollars}
                onChange={(e) => set("expectedDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Received ($)
              <input
                type="number"
                value={form.receivedDollars}
                onChange={(e) => set("receivedDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Notes
              <input
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.carrierName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save record"}
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
        {income.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No contingency or bonus income tracked yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Carrier</th>
                <th className="px-4 py-3 font-semibold">Year</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Expected</th>
                <th className="px-4 py-3 font-semibold">Received</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {income.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium">{i.carrierName}</td>
                  <td className="px-4 py-3 text-gray-500">{i.year || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {TYPE_LABEL[i.incomeType]}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {money(i.expectedCents)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {money(i.receivedCents)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={i.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          i.id,
                          e.target.value as ContingencyDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[i.status]}`}
                    >
                      <option value="projected">projected</option>
                      <option value="received">received</option>
                      <option value="closed">closed</option>
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
