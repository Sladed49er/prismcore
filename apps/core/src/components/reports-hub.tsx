"use client";

import { useMemo, useState, useTransition } from "react";
import {
  runReportAction,
  saveReportAction,
  deleteReportAction,
} from "@/app/(shell)/m/reports/actions";
import {
  emptySpec,
  type ReportSpec,
  type ReportFilter,
  type ReportAggregate,
  type FieldRef,
  type FilterOp,
  type AggFn,
} from "@/lib/reports/spec";
import type {
  ModelDescriptor,
  EntityDescriptor,
  FieldDescriptor,
} from "@/lib/reports/descriptor";
import type { ReportResult } from "@/lib/reports/engine";
import { exportRowsToCsv, type CsvColumn } from "@/lib/csv";

/**
 * The report builder UI — pick a base record type, pull columns from related
 * records, filter, group and total, run, and save. The spec it produces is
 * structured (never SQL); the server engine executes it tenant-scoped.
 */

export interface SavedReportDTO {
  id: string;
  name: string;
  description: string | null;
  spec: ReportSpec;
  createdBy: string | null;
  updatedAt: string;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const selectClass =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500";

/** The filter operators, in display order, with their labels. */
const FILTER_OPS: { op: FilterOp; label: string }[] = [
  { op: "eq", label: "equals" },
  { op: "ne", label: "not equals" },
  { op: "contains", label: "contains" },
  { op: "gt", label: ">" },
  { op: "lt", label: "<" },
  { op: "gte", label: "≥" },
  { op: "lte", label: "≤" },
  { op: "is_empty", label: "is empty" },
  { op: "not_empty", label: "is not empty" },
];

const AGG_FNS: AggFn[] = ["count", "sum", "avg", "min", "max"];

const sameRef = (a: FieldRef, b: FieldRef): boolean =>
  a.entity === b.entity && a.field === b.field;

/** Format a result cell by its column type. */
function formatCell(value: unknown, type: string): string {
  if (value == null || value === "") return "—";
  if (type === "money") {
    return (
      "$" +
      (Number(value) / 100).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  if (type === "date") {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  }
  if (type === "number") {
    return Number(value).toLocaleString();
  }
  return String(value);
}

/** A labelled group of field toggle chips for one entity. */
function FieldChipGroup({
  entity,
  selected,
  onToggle,
}: {
  entity: EntityDescriptor;
  selected: FieldRef[];
  onToggle: (ref: FieldRef) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {entity.label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {entity.fields.map((f) => {
          const ref: FieldRef = { entity: entity.key, field: f.key };
          const on = selected.some((s) => sameRef(s, ref));
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onToggle(ref)}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                on
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReportsHub({
  model,
  savedReports,
}: {
  model: ModelDescriptor;
  savedReports: SavedReportDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [spec, setSpec] = useState<ReportSpec>(() =>
    emptySpec(model.entities[0]!.key),
  );
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Client-side sort of the displayed result rows.
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ── Entity lookups ──────────────────────────────────────────────────────
  const entityByKey = useMemo(() => {
    const m = new Map<string, EntityDescriptor>();
    for (const e of model.entities) m.set(e.key, e);
    return m;
  }, [model.entities]);

  /** Entities usable for the current base, in model order. */
  const availableEntities = useMemo<EntityDescriptor[]>(() => {
    const keys = model.reachable[spec.base] ?? [];
    return keys
      .map((k) => entityByKey.get(k))
      .filter((e): e is EntityDescriptor => e != null);
  }, [model.reachable, spec.base, entityByKey]);

  const summarize = spec.groupBy.length > 0 || spec.aggregates.length > 0;

  function fieldsOf(entityKey: string): FieldDescriptor[] {
    return entityByKey.get(entityKey)?.fields ?? [];
  }

  // ── Saved-report actions ────────────────────────────────────────────────
  function loadReport(r: SavedReportDTO): void {
    setSpec(r.spec);
    setLoadedId(r.id);
    setName(r.name);
    setDescription(r.description ?? "");
    setResult(null);
    setError("");
    setSortKey(null);
  }

  function newReport(): void {
    setSpec(emptySpec(model.entities[0]!.key));
    setLoadedId(null);
    setName("");
    setDescription("");
    setResult(null);
    setError("");
    setSortKey(null);
  }

  function deleteLoaded(): void {
    if (!loadedId) return;
    if (!confirm("Delete this saved report? This cannot be undone.")) return;
    const id = loadedId;
    startTransition(async () => {
      try {
        await deleteReportAction(id);
        newReport();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete report.");
      }
    });
  }

  // ── Builder mutations ───────────────────────────────────────────────────
  function changeBase(base: string): void {
    setSpec(emptySpec(base));
    setResult(null);
    setError("");
    setSortKey(null);
  }

  function toggleSummarize(on: boolean): void {
    setSpec((s) =>
      on
        ? { ...s, columns: [] }
        : { ...s, groupBy: [], aggregates: [] },
    );
  }

  function toggleColumn(ref: FieldRef): void {
    setSpec((s) => ({
      ...s,
      columns: s.columns.some((c) => sameRef(c, ref))
        ? s.columns.filter((c) => !sameRef(c, ref))
        : [...s.columns, ref],
    }));
  }

  function toggleGroupBy(ref: FieldRef): void {
    setSpec((s) => ({
      ...s,
      groupBy: s.groupBy.some((g) => sameRef(g, ref))
        ? s.groupBy.filter((g) => !sameRef(g, ref))
        : [...s.groupBy, ref],
    }));
  }

  // Aggregates
  function addAggregate(): void {
    const first = availableEntities[0];
    setSpec((s) => ({
      ...s,
      aggregates: [
        ...s.aggregates,
        { fn: "count", entity: first?.key ?? "", field: "" },
      ],
    }));
  }

  function updateAggregate(i: number, patch: Partial<ReportAggregate>): void {
    setSpec((s) => ({
      ...s,
      aggregates: s.aggregates.map((a, idx) =>
        idx === i ? { ...a, ...patch } : a,
      ),
    }));
  }

  function removeAggregate(i: number): void {
    setSpec((s) => ({
      ...s,
      aggregates: s.aggregates.filter((_, idx) => idx !== i),
    }));
  }

  // Filters
  function addFilter(): void {
    const first = availableEntities[0];
    setSpec((s) => ({
      ...s,
      filters: [
        ...s.filters,
        {
          entity: first?.key ?? "",
          field: first?.fields[0]?.key ?? "",
          op: "eq",
          value: "",
        },
      ],
    }));
  }

  function updateFilter(i: number, patch: Partial<ReportFilter>): void {
    setSpec((s) => ({
      ...s,
      filters: s.filters.map((f, idx) =>
        idx === i ? { ...f, ...patch } : f,
      ),
    }));
  }

  function removeFilter(i: number): void {
    setSpec((s) => ({
      ...s,
      filters: s.filters.filter((_, idx) => idx !== i),
    }));
  }

  // ── Run & save ──────────────────────────────────────────────────────────
  function run(): void {
    setError("");
    startTransition(async () => {
      try {
        const res = await runReportAction(spec);
        setResult(res);
        setSortKey(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to run report.");
      }
    });
  }

  function save(): void {
    if (!name.trim()) {
      setError("Give the report a name before saving.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const id = await saveReportAction({
          id: loadedId ?? undefined,
          name: name.trim(),
          description: description.trim() || undefined,
          spec,
        });
        if (id) setLoadedId(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save report.");
      }
    });
  }

  // ── Result sorting ──────────────────────────────────────────────────────
  function toggleResultSort(key: string): void {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedRows = useMemo<Record<string, unknown>[]>(() => {
    if (!result || !sortKey) return result?.rows ?? [];
    const col = result.columns.find((c) => c.key === sortKey);
    if (!col) return result.rows;
    const numeric =
      col.type === "number" || col.type === "money" || col.type === "date";
    const rows = [...result.rows];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (numeric) {
        const an =
          col.type === "date"
            ? new Date(String(av)).getTime()
            : Number(av);
        const bn =
          col.type === "date"
            ? new Date(String(bv)).getTime()
            : Number(bv);
        const aok = Number.isNaN(an);
        const bok = Number.isNaN(bn);
        cmp = aok && bok ? 0 : aok ? -1 : bok ? 1 : an - bn;
      } else {
        const as = av == null ? "" : String(av).toLowerCase();
        const bs = bv == null ? "" : String(bv).toLowerCase();
        cmp = as < bs ? -1 : as > bs ? 1 : 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [result, sortKey, sortDir]);

  function exportCsv(): void {
    if (!result) return;
    const cols: CsvColumn<Record<string, unknown>>[] = result.columns.map(
      (column) => ({
        header: column.label,
        cell: (row) => {
          const v = row[column.key];
          return v == null
            ? ""
            : typeof v === "number"
              ? v
              : String(v);
        },
      }),
    );
    exportRowsToCsv("report", cols, sortedRows);
  }

  const resultEmpty =
    !result || result.columns.length === 0 || result.rows.length === 0;

  return (
    <div className="mt-6 space-y-5">
      {/* ── Saved reports row ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-400">Saved:</span>
        {savedReports.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => loadReport(r)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              loadedId === r.id
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {r.name}
          </button>
        ))}
        <button
          type="button"
          onClick={newReport}
          className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          + New report
        </button>
        {loadedId ? (
          <button
            type="button"
            onClick={deleteLoaded}
            disabled={pending}
            className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
          >
            Delete
          </button>
        ) : null}
      </div>

      {/* ── Builder card ──────────────────────────────────────────────── */}
      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
        {/* Base record type */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Base record type
            <select
              value={spec.base}
              onChange={(e) => changeBase(e.target.value)}
              className={inputClass}
            >
              {model.entities.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1 text-xs text-gray-400">
            The report has one row per base record. Columns, filters, and
            totals can pull from records related to it.
          </p>
        </div>

        {/* Summarize toggle */}
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={summarize}
            onChange={(e) => toggleSummarize(e.target.checked)}
          />
          Summarize (group &amp; total)
        </label>

        {/* Columns — detail mode */}
        {!summarize ? (
          <div>
            <p className="text-sm font-semibold text-gray-700">Columns</p>
            <p className="text-xs text-gray-400">
              Pick the fields to show. One row per base record.
            </p>
            <div className="mt-3 space-y-3">
              {availableEntities.map((e) => (
                <FieldChipGroup
                  key={e.key}
                  entity={e}
                  selected={spec.columns}
                  onToggle={toggleColumn}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Group by — summarize mode */}
        {summarize ? (
          <div>
            <p className="text-sm font-semibold text-gray-700">Group by</p>
            <p className="text-xs text-gray-400">
              The report is grouped by these fields.
            </p>
            <div className="mt-3 space-y-3">
              {availableEntities.map((e) => (
                <FieldChipGroup
                  key={e.key}
                  entity={e}
                  selected={spec.groupBy}
                  onToggle={toggleGroupBy}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Totals / aggregates — summarize mode */}
        {summarize ? (
          <div>
            <p className="text-sm font-semibold text-gray-700">Totals</p>
            <div className="mt-2 space-y-2">
              {spec.aggregates.map((a, i) => {
                const numberFields = fieldsOf(a.entity).filter(
                  (f) => f.type === "number" || f.type === "money",
                );
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <select
                      value={a.fn}
                      onChange={(e) =>
                        updateAggregate(i, {
                          fn: e.target.value as AggFn,
                        })
                      }
                      className={selectClass}
                    >
                      {AGG_FNS.map((fn) => (
                        <option key={fn} value={fn}>
                          {fn}
                        </option>
                      ))}
                    </select>
                    {a.fn !== "count" ? (
                      <>
                        <select
                          value={a.entity}
                          onChange={(e) =>
                            updateAggregate(i, {
                              entity: e.target.value,
                              field: "",
                            })
                          }
                          className={selectClass}
                        >
                          {availableEntities.map((e) => (
                            <option key={e.key} value={e.key}>
                              {e.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={a.field}
                          onChange={(e) =>
                            updateAggregate(i, { field: e.target.value })
                          }
                          className={selectClass}
                        >
                          <option value="">Field…</option>
                          {numberFields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeAggregate(i)}
                      className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addAggregate}
              className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              + Add total
            </button>
          </div>
        ) : null}

        {/* Filters */}
        <div>
          <p className="text-sm font-semibold text-gray-700">Filters</p>
          <div className="mt-2 space-y-2">
            {spec.filters.map((f, i) => {
              const hideValue = f.op === "is_empty" || f.op === "not_empty";
              return (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select
                    value={f.entity}
                    onChange={(e) =>
                      updateFilter(i, {
                        entity: e.target.value,
                        field:
                          fieldsOf(e.target.value)[0]?.key ?? "",
                      })
                    }
                    className={selectClass}
                  >
                    {availableEntities.map((e) => (
                      <option key={e.key} value={e.key}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={f.field}
                    onChange={(e) =>
                      updateFilter(i, { field: e.target.value })
                    }
                    className={selectClass}
                  >
                    {fieldsOf(f.entity).map((fld) => (
                      <option key={fld.key} value={fld.key}>
                        {fld.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={f.op}
                    onChange={(e) =>
                      updateFilter(i, { op: e.target.value as FilterOp })
                    }
                    className={selectClass}
                  >
                    {FILTER_OPS.map((o) => (
                      <option key={o.op} value={o.op}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {!hideValue ? (
                    <input
                      value={f.value}
                      onChange={(e) =>
                        updateFilter(i, { value: e.target.value })
                      }
                      placeholder="Value"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeFilter(i)}
                    className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addFilter}
            className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            + Add filter
          </button>
        </div>

        {/* Run + save */}
        <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={run}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {pending ? "Running…" : "Run report"}
          </button>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Report name"
              className={inputClass}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Description
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </label>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
          >
            {loadedId ? "Update report" : "Save report"}
          </button>
        </div>

        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>

      {/* ── Results ───────────────────────────────────────────────────── */}
      {result ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <p className="text-sm font-semibold text-gray-700">
              {result.rows.length}{" "}
              {result.rows.length === 1 ? "row" : "rows"}
            </p>
            <button
              type="button"
              onClick={exportCsv}
              disabled={resultEmpty}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
            >
              Export CSV
            </button>
          </div>
          {resultEmpty ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              {result.columns.length === 0
                ? "No columns selected — pick columns or totals, then run."
                : "No rows matched this report."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    {result.columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => toggleResultSort(col.key)}
                        className="cursor-pointer select-none px-4 py-3 font-semibold whitespace-nowrap hover:text-gray-700"
                      >
                        {col.label}
                        {sortKey === col.key
                          ? sortDir === "asc"
                            ? " ▲"
                            : " ▼"
                          : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedRows.map((row, i) => (
                    <tr key={i}>
                      {result.columns.map((col) => (
                        <td
                          key={col.key}
                          className="px-4 py-3 text-gray-700"
                        >
                          {formatCell(row[col.key], col.type)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
