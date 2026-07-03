"use client";

import { useState, useTransition } from "react";
import {
  saveSettings,
  type SeoSettingsForm,
} from "@/app/(shell)/m/seo_engine/actions";

export interface SeoSettingsDTO {
  siteUrl: string;
  brandBrief: string;
  publishMode: "github_commit" | "manual";
  repoOwner: string;
  repoName: string;
  repoBranch: string;
  contentDir: string;
  urlPrefix: string;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function SeoSettingsPanel({
  settings,
}: {
  settings: SeoSettingsDTO;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<SeoSettingsForm>({ ...settings });
  const [saved, setSaved] = useState(false);

  function set<K extends keyof SeoSettingsForm>(
    key: K,
    value: SeoSettingsForm[K],
  ): void {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await saveSettings(form);
      setSaved(true);
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
      <p className="text-sm text-gray-500">
        The brand brief grounds every article; the repository settings tell
        the publisher where approved drafts go.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Site URL</span>
          <input
            className={inputClass}
            value={form.siteUrl}
            onChange={(e) => set("siteUrl", e.target.value)}
            placeholder="https://www.piawest.com"
          />
        </label>
        <label className="block">
          <span className={labelClass}>Publish mode</span>
          <select
            className={inputClass}
            value={form.publishMode}
            onChange={(e) => set("publishMode", e.target.value)}
          >
            <option value="manual">Manual (copy content out)</option>
            <option value="github_commit">GitHub commit (auto-deploy)</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Brand brief</span>
          <textarea
            className={inputClass}
            rows={3}
            value={form.brandBrief}
            onChange={(e) => set("brandBrief", e.target.value)}
            placeholder="Who this organization is, who it serves, and the voice its content should carry."
          />
        </label>
        <label className="block">
          <span className={labelClass}>Repo owner</span>
          <input
            className={inputClass}
            value={form.repoOwner}
            onChange={(e) => set("repoOwner", e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Repo name</span>
          <input
            className={inputClass}
            value={form.repoName}
            onChange={(e) => set("repoName", e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Branch</span>
          <input
            className={inputClass}
            value={form.repoBranch}
            onChange={(e) => set("repoBranch", e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Content directory</span>
          <input
            className={inputClass}
            value={form.contentDir}
            onChange={(e) => set("contentDir", e.target.value)}
            placeholder="content/news"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Article URL prefix</span>
          <input
            className={inputClass}
            value={form.urlPrefix}
            onChange={(e) => set("urlPrefix", e.target.value)}
            placeholder="/news-releases-and-bulletins"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Save settings
        </button>
        {saved && (
          <span className="text-sm text-emerald-600">Saved.</span>
        )}
      </div>
    </section>
  );
}
