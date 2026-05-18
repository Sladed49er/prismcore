import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadTerms, moduleLabel } from "@/lib/terminology";

/** Sub-modules that are built and live. */
const BUILT = [
  {
    href: "/m/carriers/directory",
    name: "Carrier Directory",
    desc: "Appointed carriers and markets — appetite, contacts, status.",
  },
  {
    href: "/m/carriers/appointments",
    name: "Appointments",
    desc: "Carrier appointments by line, with commission rates.",
  },
  {
    href: "/m/carriers/contacts",
    name: "Carrier Contacts",
    desc: "Underwriters, marketing reps, claims and billing contacts.",
  },
  {
    href: "/m/carriers/guidelines",
    name: "Underwriting Guidelines",
    desc: "Each carrier's appetite and underwriting rules by line.",
  },
  {
    href: "/m/carriers/intelligence",
    name: "Carrier Intelligence",
    desc: "Performance scorecards — loss ratio, commission variance — and NAICS appetite matching.",
  },
];

/** The remaining carriers sub-modules, ported in over the coming turns. */
const PLANNED: string[] = [];

export default async function CarriersHub() {
  await requireModule("carriers");
  const { config } = await loadCurrentTenant();
  const terms = await loadTerms(config.id);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {moduleLabel(terms, "carriers", "Carriers")}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The agency&rsquo;s carrier relationships — the directory, appointments,
        the people at each market, and their underwriting guidelines.
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
            Coming next in the carriers build-out
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
          ✓ Carriers is fully built out.
        </p>
      )}
    </div>
  );
}
