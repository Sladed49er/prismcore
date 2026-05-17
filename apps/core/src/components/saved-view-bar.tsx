"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveListView } from "@/app/(shell)/settings/customize/actions";

/** A saved layout for a list — columns, sort, and filters. */
export interface SavedViewConfig {
  columns?: string[];
  sortBy?: string;
  sortDir?: "asc" | "desc";
  filters?: Record<string, string>;
}

export interface SavedViewItem {
  id: string;
  name: string;
  isDefault: boolean;
  config: SavedViewConfig;
}

export interface ColumnDef {
  key: string;
  label: string;
}

/**
 * The list-view control bar — search, saved-view picker, "save view", and
 * column toggles. Shared by the lists that support saved views so the
 * affordance looks and behaves the same. The owning panel holds the view
 * state; this bar reads it and reports changes back.
 */
export function SavedViewBar({
  listKey,
  columns,
  visibleColumns,
  onVisibleColumnsChange,
  query,
  onQueryChange,
  sortBy,
  sortDir,
  savedViews,
  onApplyView,
  searchPlaceholder = "Search…",
}: {
  listKey: string;
  columns: ColumnDef[];
  visibleColumns: string[];
  onVisibleColumnsChange: (cols: string[]) => void;
  query: string;
  onQueryChange: (q: string) => void;
  sortBy: string | null;
  sortDir: "asc" | "desc";
  savedViews: SavedViewItem[];
  onApplyView: (config: SavedViewConfig) => void;
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleColumn(key: string): void {
    const has = visibleColumns.includes(key);
    // Never let the table lose its last column.
    if (has && visibleColumns.length === 1) return;
    onVisibleColumnsChange(
      has
        ? visibleColumns.filter((k) => k !== key)
        : columns.filter((c) => visibleColumns.includes(c.key) || c.key === key)
            .map((c) => c.key),
    );
  }

  function applyView(id: string): void {
    const view = savedViews.find((v) => v.id === id);
    if (view) onApplyView(view.config);
  }

  function saveView(): void {
    const name = window.prompt("Name this view");
    if (!name || !name.trim()) return;
    startTransition(async () => {
      await saveListView({
        listKey,
        name: name.trim(),
        config: {
          columns: visibleColumns,
          sortBy: sortBy ?? undefined,
          sortDir,
          filters: query.trim() ? { query: query.trim() } : {},
        },
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) applyView(e.target.value);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 outline-none focus:border-indigo-500"
        >
          <option value="">
            {savedViews.length ? "Apply a saved view…" : "No saved views"}
          </option>
          {savedViews.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.isDefault ? " (default)" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={saveView}
          disabled={pending}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save view"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-gray-400">Columns:</span>
        {columns.map((c) => {
          const on = visibleColumns.includes(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleColumn(c.key)}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                on
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 text-gray-400 hover:border-gray-300"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
