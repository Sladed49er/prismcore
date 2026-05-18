"use client";

import { useState, useTransition } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { openPortal } from "@/app/(shell)/settings/billing/actions";

/**
 * The lockout screen shown when a tenant's workspace has been suspended for
 * non-payment (30 days past due — see `lib/billing-dunning.ts`). It replaces
 * the entire shell: the only ways forward are to reactivate via the Stripe
 * customer portal or to contact support.
 */
export function SuspendedScreen({ workspaceName }: { workspaceName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reactivate(): void {
    setError(null);
    startTransition(async () => {
      try {
        window.location.href = await openPortal();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Couldn't open the billing portal",
        );
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
          Workspace suspended
        </span>

        <h1 className="mt-4 text-xl font-semibold text-gray-900">
          {workspaceName} is locked
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          This workspace has been suspended because a subscription payment is
          more than 30 days overdue. Your data is safe and untouched — access
          is restored automatically once payment is resolved.
        </p>

        {error ? (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={reactivate}
          disabled={pending}
          className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Opening…" : "Update payment & reactivate"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          Need help? Email{" "}
          <a
            href="mailto:billing@prismams.com"
            className="font-medium text-indigo-600 hover:underline"
          >
            billing@prismams.com
          </a>
        </p>

        <div className="mt-6 border-t border-gray-100 pt-4 text-center">
          <SignOutButton>
            <button
              type="button"
              className="text-sm font-medium text-gray-400 transition hover:text-gray-600"
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
