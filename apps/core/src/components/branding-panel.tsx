"use client";

import { useState, useTransition } from "react";
import type { BrandingDTO } from "@/components/customize-hub";
import { saveBranding } from "@/app/(shell)/settings/customize/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";

/**
 * The branding panel: workspace name, accent colour, and logo for this tenant.
 * A live preview reflects the values before they are saved.
 */
export function BrandingPanel({ branding }: { branding: BrandingDTO }) {
  const [pending, startTransition] = useTransition();
  const [workspaceName, setWorkspaceName] = useState(branding.workspaceName);
  const [accentColor, setAccentColor] = useState(
    branding.accentColor || "#4f46e5",
  );
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl);

  function save(): void {
    startTransition(async () => {
      await saveBranding({ workspaceName, accentColor, logoUrl });
    });
  }

  const previewName = workspaceName.trim() || "Prism Core";

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Workspace name
            <input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Prism Core"
              className={inputClass}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Accent colour
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-gray-300"
              />
              <input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#4f46e5"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:col-span-2">
            Logo URL
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…/logo.png"
              className={inputClass}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save branding"}
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Preview
        </p>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            {logoUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`${previewName} logo`}
                className="h-8 w-8 rounded object-contain"
              />
            ) : (
              <span
                className="flex h-8 w-8 items-center justify-center rounded text-sm font-bold text-white"
                style={{ backgroundColor: accentColor }}
              >
                {previewName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="font-semibold text-gray-800">{previewName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-6 w-6 rounded-full border border-gray-200"
              style={{ backgroundColor: accentColor }}
            />
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
              style={{ backgroundColor: accentColor }}
            >
              Sample button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
