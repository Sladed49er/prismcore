"use client";

import { useTransition } from "react";
import type { SavedViewDTO } from "@/components/customize-hub";
import {
  removeSavedView,
  makeViewDefault,
} from "@/app/(shell)/settings/customize/actions";

/**
 * The saved-views panel: a management surface only. Saved views are created
 * from the list pages themselves; here a tenant can promote one to the default
 * or delete it.
 */
export function SavedViewsPanel({ views }: { views: SavedViewDTO[] }) {
  const [pending, startTransition] = useTransition();

  function makeDefault(viewId: string): void {
    startTransition(async () => {
      await makeViewDefault(viewId);
    });
  }

  function remove(view: SavedViewDTO): void {
    if (!confirm(`Delete the "${view.name}" saved view? This cannot be undone.`))
      return;
    startTransition(async () => {
      await removeSavedView(view.id);
    });
  }

  if (views.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
        Saved views appear here once you save one from a list page.
      </div>
    );
  }

  const listKeys = [...new Set(views.map((v) => v.listKey))];

  return (
    <div className="mt-6 space-y-6">
      {listKeys.map((listKey) => {
        const group = views.filter((v) => v.listKey === listKey);
        return (
          <div key={listKey}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {listKey}
            </p>
            <div className="mt-2 rounded-xl border border-gray-200 bg-white">
              <ul className="divide-y divide-gray-100">
                {group.map((view) => (
                  <li
                    key={view.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <span>
                      <span className="font-medium">{view.name}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        {view.columnCount} columns
                      </span>
                      {view.isDefault ? (
                        <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Default
                        </span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-3">
                      {!view.isDefault ? (
                        <button
                          type="button"
                          onClick={() => makeDefault(view.id)}
                          disabled={pending}
                          className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 disabled:opacity-40"
                        >
                          Make default
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => remove(view)}
                        disabled={pending}
                        className="text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
