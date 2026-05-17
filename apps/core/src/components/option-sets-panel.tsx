"use client";

import { useState, useTransition } from "react";
import type { OptionSetDTO, OptionItemDTO } from "@/components/customize-hub";
import {
  newOptionSet,
  removeOptionSet,
  newOptionItem,
  editOptionItem,
  deleteOptionItem,
} from "@/app/(shell)/settings/customize/actions";

const COLORS = [
  "gray",
  "green",
  "amber",
  "red",
  "blue",
  "indigo",
  "purple",
  "pink",
] as const;

const BADGE_CLASS: Record<string, string> = {
  gray: "bg-gray-100 text-gray-600",
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-rose-50 text-rose-700",
  blue: "bg-blue-50 text-blue-700",
  indigo: "bg-indigo-50 text-indigo-700",
  purple: "bg-purple-50 text-purple-700",
  pink: "bg-pink-50 text-pink-700",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";

const selectClass =
  "mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";

/**
 * The statuses & picklists panel: create tenant-owned option sets, or restyle
 * the built-in ones via a `core:`-prefixed setKey. Tenant-isolated; nothing
 * here can touch another tenant or reach code.
 */
export function OptionSetsPanel({
  optionSets,
}: {
  optionSets: OptionSetDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [setKey, setSetKey] = useState("");
  const [description, setDescription] = useState("");

  function create(): void {
    if (!name.trim() || !setKey.trim()) return;
    startTransition(async () => {
      await newOptionSet({
        setKey: setKey.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setSetKey("");
      setDescription("");
    });
  }

  function deleteSet(set: OptionSetDTO): void {
    if (!confirm(`Delete the "${set.name}" picklist? This cannot be undone.`))
      return;
    startTransition(async () => {
      await removeOptionSet(set.id);
    });
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-700">New picklist</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label
              htmlFor="os-name"
              className="text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Name
            </label>
            <input
              id="os-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lead source"
              className={inputClass}
            />
          </div>
          <div className="min-w-48 flex-1">
            <label
              htmlFor="os-key"
              className="text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Set key
            </label>
            <input
              id="os-key"
              value={setKey}
              onChange={(e) => setSetKey(e.target.value)}
              placeholder="e.g. lead_source"
              className={inputClass}
            />
          </div>
          <div className="min-w-48 flex-1">
            <label
              htmlFor="os-desc"
              className="text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Description
            </label>
            <input
              id="os-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={create}
            disabled={pending || !name.trim() || !setKey.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create picklist
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          A set key beginning with{" "}
          <code className="font-mono text-gray-600">core:</code> overrides a
          built-in status field.
        </p>
      </div>

      {optionSets.length === 0 ? (
        <p className="text-sm text-gray-500">
          No picklists yet. Create one above.
        </p>
      ) : (
        optionSets.map((set) => (
          <OptionSetCard
            key={set.id}
            set={set}
            pending={pending}
            startTransition={startTransition}
            onDelete={() => deleteSet(set)}
          />
        ))
      )}
    </div>
  );
}

function OptionSetCard({
  set,
  pending,
  startTransition,
  onDelete,
}: {
  set: OptionSetDTO;
  pending: boolean;
  startTransition: (cb: () => void) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<string>("gray");

  function addItem(): void {
    if (!label.trim()) return;
    startTransition(async () => {
      await newOptionItem({
        optionSetId: set.id,
        value: "",
        label: label.trim(),
        color,
      });
      setLabel("");
      setColor("gray");
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-semibold text-gray-800">{set.name}</span>
          <span className="ml-2 font-mono text-xs text-gray-400">
            {set.setKey}
          </span>
          {set.isCoreOverride ? (
            <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              core override
            </span>
          ) : null}
          {set.description ? (
            <p className="mt-0.5 text-sm text-gray-500">{set.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="text-sm text-gray-400 transition hover:text-red-600 disabled:opacity-40"
        >
          Delete picklist
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {set.items.length === 0 ? (
          <p className="text-sm text-gray-500">No options yet.</p>
        ) : (
          set.items.map((item) => (
            <OptionItemRow
              key={item.id}
              item={item}
              pending={pending}
              startTransition={startTransition}
            />
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
        <div className="min-w-48 flex-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Option label
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Referral"
              className={inputClass}
            />
          </label>
        </div>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Colour
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className={`block ${selectClass}`}
          >
            {COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={addItem}
          disabled={pending || !label.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add option
        </button>
      </div>
    </div>
  );
}

function OptionItemRow({
  item,
  pending,
  startTransition,
}: {
  item: OptionItemDTO;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [color, setColor] = useState(item.color);

  function save(patch: Partial<{ label: string; color: string }>): void {
    startTransition(async () => {
      await editOptionItem(item.id, patch);
    });
  }

  function remove(): void {
    startTransition(async () => {
      await deleteOptionItem(item.id);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          BADGE_CLASS[item.color] ?? BADGE_CLASS.gray
        }`}
      >
        {item.label}
      </span>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => {
          if (label.trim() && label !== item.label) save({ label });
        }}
        className="w-40 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
      />
      <select
        value={color}
        onChange={(e) => {
          setColor(e.target.value);
          save({ color: e.target.value });
        }}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
      >
        {COLORS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="text-sm text-gray-400 transition hover:text-red-600 disabled:opacity-40"
      >
        Remove
      </button>
    </div>
  );
}
