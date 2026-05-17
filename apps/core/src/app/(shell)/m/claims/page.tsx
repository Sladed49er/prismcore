import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadTerms, moduleLabel } from "@/lib/terminology";

/** Sub-modules that are built and live. */
const BUILT = [
  {
    href: "/m/claims/register",
    name: "Claims Register",
    desc: "Every claim filed — tracked from first notice of loss through settlement.",
  },
  {
    href: "/m/claims/diary",
    name: "Claim Diary",
    desc: "The chronological record — diary, contacts, coverage, investigation.",
  },
  {
    href: "/m/claims/reserves",
    name: "Reserves",
    desc: "The reserve-change ledger — indemnity, expense, legal, medical.",
  },
  {
    href: "/m/claims/payments",
    name: "Claim Payments",
    desc: "Loss and expense payments issued, tracked through clearing.",
  },
  {
    href: "/m/claims/recoveries",
    name: "Recovery & Subrogation",
    desc: "Subrogation, salvage, and deductible recovery on the claim file.",
  },
  {
    href: "/m/claims/parties",
    name: "Claim Parties",
    desc: "Claimants, witnesses, adjusters, attorneys, and third parties.",
  },
  {
    href: "/m/claims/litigation",
    name: "Litigation",
    desc: "Suits arising from a claim — court, docket, defense, trial date.",
  },
];

/** The remaining claims sub-modules, ported in over the coming turns. */
const PLANNED: string[] = [];

export default async function ClaimsHub() {
  await requireModule("claims");
  const { config } = await loadCurrentTenant();
  const terms = await loadTerms(config.id);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {moduleLabel(terms, "claims", "Claims")}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The full claims lifecycle — the register, the diary, reserves,
        payments, and recovery — for every loss on the book.
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
            Coming next in the claims build-out
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
          ✓ Claims is fully built out.
        </p>
      )}
    </div>
  );
}
