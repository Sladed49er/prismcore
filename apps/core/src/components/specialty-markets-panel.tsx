"use client";

import { useState, useTransition } from "react";
import {
  newMarket,
  editMarket,
  toggleMarketActive,
  removeMarket,
  findMarkets,
  type MarketForm,
} from "@/app/(shell)/m/specialty_markets/actions";
import type { MarketMatch } from "@/lib/specialty-markets-assistant";

export interface SpecialtyMarketDTO {
  id: string;
  name: string;
  marketType: "mga" | "wholesaler" | "surplus_carrier" | "program" | "other";
  appetite: string;
  linesOfBusiness: string;
  states: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  notes: string;
  isActive: boolean;
}

const TYPES = [
  "mga",
  "wholesaler",
  "surplus_carrier",
  "program",
  "other",
] as const;

const TYPE_LABEL: Record<SpecialtyMarketDTO["marketType"], string> = {
  mga: "MGA",
  wholesaler: "Wholesaler",
  surplus_carrier: "Surplus carrier",
  program: "Program",
  other: "Other",
};

const EMPTY: MarketForm = {
  name: "",
  marketType: "mga",
  appetite: "",
  linesOfBusiness: "",
  states: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

function Stars({ score }: { score: number }) {
  return (
    <span className="text-amber-500" title={`Fit ${score}/5`}>
      {"★".repeat(score)}
      <span className="text-gray-300">{"★".repeat(5 - score)}</span>
    </span>
  );
}

export function SpecialtyMarketsPanel({
  markets,
}: {
  markets: SpecialtyMarketDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MarketForm>({ ...EMPTY });

  const [risk, setRisk] = useState("");
  const [matches, setMatches] = useState<MarketMatch[] | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  function set<K extends keyof MarketForm>(key: K, value: MarketForm[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(m: SpecialtyMarketDTO): void {
    setEditId(m.id);
    setForm({
      name: m.name,
      marketType: m.marketType,
      appetite: m.appetite,
      linesOfBusiness: m.linesOfBusiness,
      states: m.states,
      contactName: m.contactName,
      contactEmail: m.contactEmail,
      contactPhone: m.contactPhone,
      website: m.website,
      notes: m.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editMarket({ id: editId, ...form });
      else await newMarket(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function search(): void {
    setMatchError(null);
    setMatches(null);
    startTransition(async () => {
      const result = await findMarkets(risk);
      if (result.error) setMatchError(result.error);
      else setMatches(result.matches);
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this market?")) return;
    startTransition(async () => {
      await removeMarket(id);
    });
  }

  const nameById = new Map(markets.map((m) => [m.id, m]));

  return (
    <div className="mt-6">
      {/* AI market matcher */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
        <p className="text-sm font-semibold text-indigo-900">
          ✨ Find a market for a risk
        </p>
        <p className="mt-0.5 text-xs text-indigo-700">
          Describe the risk — class of business, exposures, state — and the AI
          ranks the markets in your repository by fit.
        </p>
        <textarea
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          rows={2}
          placeholder="e.g. Restaurant with a liquor license in FL, $1.5M building, prior water loss"
          className="mt-3 w-full rounded-lg border border-indigo-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={search}
          disabled={pending || !risk.trim()}
          className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
        >
          {pending ? "Matching…" : "Find markets"}
        </button>

        {matchError ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {matchError}
          </p>
        ) : null}

        {matches ? (
          matches.length === 0 ? (
            <p className="mt-3 text-sm text-indigo-800">
              No markets in your repository fit that risk well.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {matches.map((m) => {
                const market = nameById.get(m.marketId);
                return (
                  <div
                    key={m.marketId}
                    className="rounded-lg border border-indigo-100 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{m.marketName}</span>
                      <Stars score={m.fitScore} />
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {m.reasoning}
                    </p>
                    {market?.contactEmail || market?.contactPhone ? (
                      <p className="mt-1 text-xs text-gray-400">
                        {[market.contactName, market.contactEmail, market.contactPhone]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )
        ) : null}
      </div>

      {/* Repository */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {markets.length} market{markets.length === 1 ? "" : "s"} ·{" "}
          {markets.filter((m) => m.isActive).length} active
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New market
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Market name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Type
              <select
                value={form.marketType}
                onChange={(e) => set("marketType", e.target.value)}
                className={inputClass}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Appetite
              <input
                value={form.appetite}
                onChange={(e) => set("appetite", e.target.value)}
                placeholder="What they write — classes, exposures, limits"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Lines of business
              <input
                value={form.linesOfBusiness}
                onChange={(e) => set("linesOfBusiness", e.target.value)}
                placeholder="Cyber, Professional, E&O"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              States
              <input
                value={form.states}
                onChange={(e) => set("states", e.target.value)}
                placeholder="FL, GA, AL"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Contact name
              <input
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Contact email
              <input
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Contact phone
              <input
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Website
              <input
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
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
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : editId ? "Save changes" : "Save market"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {markets.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No specialty markets yet — build your repository so the AI matcher
            has something to search.
          </p>
        ) : (
          markets.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl border bg-white p-5 ${
                m.isActive ? "border-gray-200" : "border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {m.name}
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {TYPE_LABEL[m.marketType]}
                    </span>
                  </p>
                  {m.appetite ? (
                    <p className="mt-1 text-sm text-gray-600">{m.appetite}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-gray-400">
                    {[
                      m.linesOfBusiness && `Lines: ${m.linesOfBusiness}`,
                      m.states && `States: ${m.states}`,
                      [m.contactName, m.contactEmail, m.contactPhone]
                        .filter(Boolean)
                        .join(" · "),
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await toggleMarketActive({
                          id: m.id,
                          isActive: !m.isActive,
                        });
                      })
                    }
                    disabled={pending}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    {m.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    disabled={pending}
                    className="text-rose-600 hover:text-rose-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
