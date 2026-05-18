"use client";

import { useState } from "react";
import type { IntakeFormField } from "@prismcore/db";

/**
 * The public, no-login intake form. Renders a tenant's typed fields and
 * posts to `/api/intake/<token>`.
 */
export function PublicIntakeForm({
  token,
  name,
  description,
  fields,
}: {
  token: string;
  name: string;
  description: string;
  fields: IntakeFormField[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set(key: string, value: string): void {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/intake/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (res.ok && data.ok) {
        setDone(data.message ?? "Submitted.");
      } else {
        setError(data.message ?? "Submission failed.");
      }
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-6 py-8 text-center">
        <p className="text-lg font-semibold text-green-800">Thank you</p>
        <p className="mt-1 text-sm text-green-700">{done}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-gray-200 bg-white p-6"
    >
      <h1 className="text-xl font-semibold">{name}</h1>
      {description ? (
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      ) : null}
      <div className="mt-5 space-y-4">
        {fields.map((f) => (
          <label
            key={f.key}
            className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            {f.label}
            {f.required ? " *" : ""}
            {f.type === "textarea" ? (
              <textarea
                required={f.required}
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                rows={4}
                className={inputClass}
              />
            ) : f.type === "select" ? (
              <select
                required={f.required}
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputClass}
              >
                <option value="">Select…</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                required={f.required}
                type={
                  f.type === "email"
                    ? "email"
                    : f.type === "phone"
                      ? "tel"
                      : f.type === "number"
                        ? "number"
                        : f.type === "date"
                          ? "date"
                          : "text"
                }
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputClass}
              />
            )}
          </label>
        ))}
      </div>
      {error ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
