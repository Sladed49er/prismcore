"use client";

import { useState, useTransition } from "react";
import {
  startCheckout,
  openPortal,
} from "@/app/(shell)/settings/billing/actions";

export interface BillingDTO {
  status: string;
  currentPeriodEnd: string | null;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  none: { label: "No subscription", className: "bg-gray-100 text-gray-600" },
  trialing: { label: "Trial", className: "bg-blue-50 text-blue-700" },
  active: { label: "Active", className: "bg-green-50 text-green-700" },
  past_due: { label: "Payment overdue", className: "bg-amber-50 text-amber-700" },
  canceled: { label: "Canceled", className: "bg-gray-100 text-gray-600" },
  suspended: { label: "Suspended", className: "bg-rose-50 text-rose-700" },
};

/**
 * The billing panel — current subscription status, and the buttons to
 * subscribe (Stripe Checkout) or manage payment (Stripe customer portal).
 */
export function BillingPanel({ billing }: { billing: BillingDTO }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const subscribed =
    billing.status === "active" ||
    billing.status === "trialing" ||
    billing.status === "past_due";
  const badge = STATUS_BADGE[billing.status] ?? STATUS_BADGE.none!;

  function go(action: () => Promise<string>): void {
    setError(null);
    startTransition(async () => {
      try {
        const url = await action();
        window.location.href = url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">
          Subscription
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      {billing.currentPeriodEnd ? (
        <p className="mt-2 text-sm text-gray-500">
          Current period ends{" "}
          {new Date(billing.currentPeriodEnd).toLocaleDateString()}
        </p>
      ) : null}

      {billing.status === "past_due" ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          A payment didn&rsquo;t go through. Update your payment method to keep
          access — workspaces unpaid for 30 days are suspended.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex gap-2">
        {subscribed ? (
          <button
            type="button"
            onClick={() => go(openPortal)}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Opening…" : "Manage billing"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => go(startCheckout)}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Starting…" : "Subscribe to Prism Core"}
          </button>
        )}
      </div>
    </div>
  );
}
