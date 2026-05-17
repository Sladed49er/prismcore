"use client";

import { useState, useTransition } from "react";
import { addField, removeField } from "@/app/(shell)/settings/customize/actions";

export interface EntityRef {
  moduleId: string;
  moduleName: string;
  entityKey: string;
  label: string;
}

export interface CustomFieldDTO {
  id: string;
  entityKey: string;
  label: string;
  fieldType: string;
  required: boolean;
}

const FIELD_TYPES = ["text", "number", "date", "select", "checkbox"] as const;
type FieldType = (typeof FIELD_TYPES)[number];

/**
 * The self-service customization panel: pick an entity, see its custom fields,
 * and add or remove fields. No code — this is the "build it yourself" pillar.
 */
export function CustomizePanel({
  entities,
  fields,
}: {
  entities: EntityRef[];
  fields: CustomFieldDTO[];
}) {
  const [selectedKey, setSelectedKey] = useState(
    entities[0]?.entityKey ?? "",
  );
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [required, setRequired] = useState(false);
  const [pending, startTransition] = useTransition();

  const entity =
    entities.find((e) => e.entityKey === selectedKey) ?? entities[0];
  const entityFields = fields.filter((f) => f.entityKey === selectedKey);

  function add(): void {
    if (!label.trim() || !entity) return;
    const target = entity;
    startTransition(async () => {
      await addField({
        moduleId: target.moduleId,
        entityKey: target.entityKey,
        label: label.trim(),
        fieldType,
        required,
      });
      setLabel("");
      setRequired(false);
      setFieldType("text");
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      await removeField(id);
    });
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {entities.map((e) => (
          <button
            key={e.entityKey}
            type="button"
            onClick={() => setSelectedKey(e.entityKey)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              selectedKey === e.entityKey
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-gray-200 text-gray-600 hover:border-indigo-300"
            }`}
          >
            {e.label}
            <span className="ml-1.5 text-xs text-gray-400">{e.moduleName}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-gray-200 bg-white">
        {entityFields.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">
            No custom fields on {entity?.label ?? "this record"} yet. Add one
            below.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {entityFields.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <span>
                  <span className="font-medium">{f.label}</span>
                  <span className="ml-2 text-xs uppercase tracking-wide text-gray-400">
                    {f.fieldType}
                  </span>
                  {f.required ? (
                    <span className="ml-2 text-xs font-medium text-indigo-500">
                      required
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  disabled={pending}
                  className="text-sm text-gray-400 transition hover:text-red-600 disabled:opacity-40"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="min-w-48 flex-1">
          <label
            htmlFor="cf-label"
            className="text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Field name
          </label>
          <input
            id="cf-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Preferred contact time"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label
            htmlFor="cf-type"
            className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Type
          </label>
          <select
            id="cf-type"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as FieldType)}
            className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          Required
        </label>
        <button
          type="button"
          onClick={add}
          disabled={pending || !label.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add field
        </button>
      </div>
    </div>
  );
}
