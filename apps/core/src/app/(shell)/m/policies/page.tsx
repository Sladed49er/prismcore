import Link from "next/link";
import { requireModule } from "@/lib/kernel";

/** Sub-modules that are built and live. */
const BUILT = [
  {
    href: "/m/policies/register",
    name: "Policy Register",
    desc: "Every policy on the book — written on a client, tracked through its lifecycle.",
  },
  {
    href: "/m/policies/coverages",
    name: "Coverages",
    desc: "Coverage lines per policy — limits, deductibles, allocated premium.",
  },
  {
    href: "/m/policies/endorsements",
    name: "Endorsements",
    desc: "Mid-term policy changes with effective dates and premium deltas.",
  },
  {
    href: "/m/policies/cancellations",
    name: "Cancellations",
    desc: "Cancellation requests — flat, pro-rata, short-rate — with return premium.",
  },
  {
    href: "/m/policies/installments",
    name: "Premium Schedule",
    desc: "Installment billing schedule and payments per policy.",
  },
];

/** The remaining servicing sub-modules, ported in over the coming turns. */
const PLANNED = [
  "Insured Schedules",
  "Premium Audits",
  "Service Activities",
  "ID Cards & Documents",
];

export default async function PoliciesHub() {
  await requireModule("policies");

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Policies &amp; Servicing</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The insurance spine — the policy register and the full servicing
        lifecycle: coverages, endorsements, cancellations, and billing.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {BUILT.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300"
          >
            <h3 className="font-semibold">{s.name}</h3>
            <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
          </Link>
        ))}
      </div>

      {PLANNED.length > 0 ? (
        <>
          <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Coming next in the servicing build-out
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PLANNED.map((p) => (
              <span
                key={p}
                className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-400"
              >
                {p}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ Policies &amp; Servicing is fully built out.
        </p>
      )}
    </div>
  );
}
