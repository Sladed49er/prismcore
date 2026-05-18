"use client";

import { useState } from "react";
import type { SignField } from "@prismcore/db";

/**
 * The public, no-login signing ceremony. Shows the agreement, collects the
 * signer's fields and typed signature, and posts to `/api/sign/<token>`.
 */
export function PublicSignForm({
  token,
  documentName,
  signerName,
  body,
  fields,
  initialStatus,
}: {
  token: string;
  documentName: string;
  signerName: string;
  body: string;
  fields: SignField[];
  initialStatus: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [signedName, setSignedName] = useState(signerName);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(
    initialStatus === "signed"
      ? "This document has already been signed."
      : initialStatus === "declined"
        ? "This request was declined."
        : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  function set(key: string, value: string): void {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function post(payload: object): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (res.ok && data.ok) setDone(data.message ?? "Done.");
      else setError(data.message ?? "Something went wrong.");
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";

  if (done) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
        <p className="text-lg font-semibold">{documentName}</p>
        <p className="mt-2 text-sm text-gray-600">{done}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h1 className="text-xl font-semibold">{documentName}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Please review and sign below.
      </p>

      <div className="mt-4 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        {body || "(No agreement text was provided.)"}
      </div>

      {fields.length > 0 ? (
        <div className="mt-5 space-y-4">
          {fields.map((f) => (
            <label
              key={f.key}
              className="block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              {f.label}
              {f.required ? " *" : ""}
              <input
                type={f.type === "date" ? "date" : "text"}
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={
                  f.type === "signature"
                    ? "Type to sign"
                    : f.type === "initials"
                      ? "Your initials"
                      : ""
                }
                className={inputClass}
              />
            </label>
          ))}
        </div>
      ) : null}

      <div className="mt-5 border-t border-gray-100 pt-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Sign — type your full legal name *
          <input
            value={signedName}
            onChange={(e) => setSignedName(e.target.value)}
            className={inputClass}
          />
        </label>
        <p className="mt-1 text-xs text-gray-400">
          Typing your name and submitting constitutes your electronic
          signature.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {declining ? (
        <div className="mt-4 rounded-lg border border-gray-200 p-3">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for declining (optional)"
            className={inputClass}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void post({ action: "decline", reason })}
              disabled={busy}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Confirm decline
            </button>
            <button
              type="button"
              onClick={() => setDeclining(false)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-600"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() =>
              void post({ action: "sign", signedName, values })
            }
            disabled={busy || !signedName.trim()}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {busy ? "Submitting…" : "Sign & submit"}
          </button>
          <button
            type="button"
            onClick={() => setDeclining(true)}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}
