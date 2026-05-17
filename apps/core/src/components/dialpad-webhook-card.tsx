"use client";

import { useState } from "react";

/**
 * Shows the tenant's Dialpad call-events webhook URL — the address the agency
 * pastes into Dialpad (Settings → Integrations → API → Webhooks). Wire-
 * compatible cutover target for an agency moving off the legacy CallIntel.
 */
export function DialpadWebhookCard({
  connected,
  webhookUrl,
}: {
  connected: boolean;
  webhookUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy(): void {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Dialpad webhook
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Subscribe Dialpad&rsquo;s call events to this URL. Every call then logs
        itself here and screen-pops the caller from your AMS.
      </p>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        {connected ? (
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Dialpad connected
          </p>
        ) : (
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            Connect Dialpad above first — set its API token and webhook secret.
          </p>
        )}

        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Call-events webhook URL
        </label>
        <div className="mt-1 flex gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            {webhookUrl || "—"}
          </code>
          <button
            type="button"
            onClick={copy}
            disabled={!webhookUrl}
            className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Authentication is required: the request must carry the Dialpad
          connection&rsquo;s webhook signing secret — either as an{" "}
          <code className="rounded bg-gray-100 px-1">x-dialpad-signature</code>{" "}
          HMAC-SHA256 header, or appended as{" "}
          <code className="rounded bg-gray-100 px-1">&amp;secret=…</code>. A
          connection with no signing secret cannot receive calls.
        </p>
      </div>
    </section>
  );
}
