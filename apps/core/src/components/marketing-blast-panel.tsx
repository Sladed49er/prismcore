"use client";

import { useState, useTransition } from "react";
import { sendBlast } from "@/app/(shell)/m/marketing/actions";

export interface BlastOption {
  id: string;
  label: string;
}

/**
 * Campaign blast — send one email template to every client with an address.
 * The send is real (Resend) and logged; this is a deliberate, confirmed action.
 */
export function MarketingBlastPanel({
  campaigns,
  templates,
}: {
  campaigns: BlastOption[];
  templates: BlastOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [campaignId, setCampaignId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [status, setStatus] = useState<
    { ok: boolean; message: string } | null
  >(null);

  function send(): void {
    if (!campaignId || !templateId) return;
    if (
      !confirm(
        "Send this template to every client with an email address? This sends real email.",
      )
    ) {
      return;
    }
    setStatus(null);
    startTransition(async () => {
      setStatus(await sendBlast(campaignId, templateId));
    });
  }

  if (templates.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-5 text-sm text-gray-500">
        Create an{" "}
        <a
          href="/m/marketing/templates"
          className="font-semibold text-indigo-600 hover:underline"
        >
          email template
        </a>{" "}
        to send a campaign blast.
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
      <p className="text-sm font-semibold text-indigo-900">
        Send a campaign blast
      </p>
      <p className="mt-0.5 text-xs text-indigo-700">
        Sends the chosen template to every client with an email address.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="rounded-lg border border-indigo-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">Campaign…</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="rounded-lg border border-indigo-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">Template…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={send}
          disabled={pending || !campaignId || !templateId}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
        >
          {pending ? "Sending…" : "Send blast"}
        </button>
      </div>
      {status ? (
        <p
          className={`mt-2 rounded-lg px-3 py-1.5 text-sm ${
            status.ok
              ? "bg-green-50 text-green-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
