import Link from "next/link";
import { requireModule } from "@/lib/kernel";

/** Sub-modules that are built and live. */
const BUILT = [
  {
    href: "/m/commissions/register",
    name: "Commission Register",
    desc: "Every commission earned — tracked from earned through reconciled.",
  },
  {
    href: "/m/commissions/producers",
    name: "Producers",
    desc: "The producer master — agents who write business and earn splits.",
  },
  {
    href: "/m/commissions/splits",
    name: "Commission Splits",
    desc: "How each commission is shared among producers.",
  },
  {
    href: "/m/commissions/statements",
    name: "Carrier Statements",
    desc: "Carrier statements reconciled — expected vs. reported.",
  },
  {
    href: "/m/commissions/payouts",
    name: "Producer Payouts",
    desc: "Commission payouts to producers, scheduled and paid.",
  },
  {
    href: "/m/commissions/contingency",
    name: "Contingency & Bonus",
    desc: "Carrier contingency, profit-share, and bonus income.",
  },
];

/** The remaining commissions sub-modules, ported in over the coming turns. */
const PLANNED: string[] = [];

export default async function CommissionsHub() {
  await requireModule("commissions");

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Commissions</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Commission income end to end — the register, producers and their
        splits, carrier-statement reconciliation, and producer payouts.
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
            Coming next in the commissions build-out
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
          ✓ Commissions is fully built out.
        </p>
      )}
    </div>
  );
}
