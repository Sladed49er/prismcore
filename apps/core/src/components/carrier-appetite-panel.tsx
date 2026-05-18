"use client";

import { useState, useTransition } from "react";
import type { Appetite, AppetiteMatch } from "@/lib/carrier-appetite";
import {
  createAppetiteRule,
  removeAppetiteRule,
  runAppetiteMatch,
} from "@/app/(shell)/m/carriers/intelligence/actions";

export interface CarrierOption {
  id: string;
  name: string;
}

export interface RuleDTO {
  id: string;
  carrierName: string;
  naicsPrefix: string;
  appetite: string;
  lineOfBusiness: string;
  notes: string;
}

const APPETITES: Appetite[] = [
  "preferred",
  "neutral",
  "restricted",
  "declined",
];
const APPETITE_STYLE: Record<string, string> = {
  preferred: "bg-green-50 text-green-700",
  neutral: "bg-gray-100 text-gray-600",
  restricted: "bg-amber-50 text-amber-700",
  declined: "bg-rose-50 text-rose-700",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

function appetitePill(value: string) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${APPETITE_STYLE[value] ?? "bg-gray-100 text-gray-500"}`}
    >
      {value}
    </span>
  );
}

export function CarrierAppetitePanel({
  carriers,
  rules,
}: {
  carriers: CarrierOption[];
  rules: RuleDTO[];
}) {
  const [pending, startTransition] = useTransition();

  // Add-rule form.
  const [carrierId, setCarrierId] = useState("");
  const [naicsPrefix, setNaicsPrefix] = useState("");
  const [appetite, setAppetite] = useState<Appetite>("preferred");
  const [ruleLob, setRuleLob] = useState("");
  const [notes, setNotes] = useState("");

  // Match tool.
  const [matchNaics, setMatchNaics] = useState("");
  const [matchLob, setMatchLob] = useState("");
  const [matches, setMatches] = useState<AppetiteMatch[] | null>(null);
  const [matching, setMatching] = useState(false);

  function addRule(): void {
    if (!carrierId || !naicsPrefix.trim()) return;
    startTransition(async () => {
      await createAppetiteRule({
        carrierId,
        naicsPrefix: naicsPrefix.trim(),
        appetite,
        lineOfBusiness: ruleLob.trim(),
        notes: notes.trim(),
      });
      setNaicsPrefix("");
      setRuleLob("");
      setNotes("");
    });
  }

  function deleteRule(id: string): void {
    startTransition(async () => {
      await removeAppetiteRule(id);
    });
  }

  function match(): void {
    if (!matchNaics.trim()) return;
    setMatching(true);
    setMatches(null);
    void runAppetiteMatch(matchNaics.trim(), matchLob.trim())
      .then((m) => setMatches(m))
      .finally(() => setMatching(false));
  }

  return (
    <div className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Appetite matching
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Define each carrier&rsquo;s appetite by NAICS industry-code prefix, then
        match a risk to the right markets — the most specific prefix wins.
      </p>

      {/* Match tool */}
      <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
        <p className="text-sm font-semibold text-indigo-900">
          Find carriers for a risk
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className={labelClass}>
            NAICS code
            <input
              value={matchNaics}
              onChange={(e) => setMatchNaics(e.target.value)}
              placeholder="e.g. 722511"
              className="mt-1 w-40 rounded-lg border border-indigo-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label className={labelClass}>
            Line of business (optional)
            <input
              value={matchLob}
              onChange={(e) => setMatchLob(e.target.value)}
              placeholder="e.g. General Liability"
              className="mt-1 w-56 rounded-lg border border-indigo-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <button
            type="button"
            onClick={match}
            disabled={matching || !matchNaics.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {matching ? "Matching…" : "Find carriers"}
          </button>
        </div>
        {matches !== null ? (
          matches.length === 0 ? (
            <p className="mt-3 text-sm text-indigo-700">
              No appetite rules match that NAICS code.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {matches.map((m) => (
                <li
                  key={m.carrierId}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm"
                >
                  {appetitePill(m.appetite)}
                  <span className="font-medium">{m.carrierName}</span>
                  <span className="text-xs text-gray-400">
                    matched on {m.matchedPrefix}
                    {m.lineOfBusiness ? ` · ${m.lineOfBusiness}` : ""}
                    {m.carrierStatus !== "active"
                      ? ` · carrier ${m.carrierStatus}`
                      : ""}
                  </span>
                  {m.notes ? (
                    <span className="text-xs text-gray-500">— {m.notes}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>

      {/* Add rule */}
      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold">New appetite rule</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Carrier
            <select
              value={carrierId}
              onChange={(e) => setCarrierId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a carrier…</option>
              {carriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            NAICS prefix
            <input
              value={naicsPrefix}
              onChange={(e) => setNaicsPrefix(e.target.value)}
              placeholder="e.g. 722 (food service)"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Appetite
            <select
              value={appetite}
              onChange={(e) => setAppetite(e.target.value as Appetite)}
              className={inputClass}
            >
              {APPETITES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Line of business (optional)
            <input
              value={ruleLob}
              onChange={(e) => setRuleLob(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Notes
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={addRule}
          disabled={pending || !carrierId || !naicsPrefix.trim()}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
        >
          {pending ? "Saving…" : "Add rule"}
        </button>
      </div>

      {/* Rules list */}
      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {rules.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No appetite rules yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Carrier</th>
                <th className="px-4 py-2.5 font-semibold">NAICS prefix</th>
                <th className="px-4 py-2.5 font-semibold">Appetite</th>
                <th className="px-4 py-2.5 font-semibold">Line</th>
                <th className="px-4 py-2.5 font-semibold">Notes</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 font-medium">{r.carrierName}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.naicsPrefix}</td>
                  <td className="px-4 py-2.5">{appetitePill(r.appetite)}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {r.lineOfBusiness || "All"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {r.notes || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => deleteRule(r.id)}
                      disabled={pending}
                      className="text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
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
