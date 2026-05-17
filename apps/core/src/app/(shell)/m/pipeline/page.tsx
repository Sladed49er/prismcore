import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadTerms, moduleLabel } from "@/lib/terminology";

/** Sub-modules that are built and live. */
const BUILT = [
  {
    href: "/m/pipeline/opportunities",
    name: "Opportunity Pipeline",
    desc: "New-business and cross-sell opportunities, by stage.",
  },
  {
    href: "/m/pipeline/leads",
    name: "Leads",
    desc: "Inbound prospects worked from first contact to qualified.",
  },
  {
    href: "/m/pipeline/sources",
    name: "Lead Sources",
    desc: "The marketing channels every lead is attributed to.",
  },
  {
    href: "/m/pipeline/campaigns",
    name: "Campaigns",
    desc: "Outbound marketing campaigns — channel, schedule, budget.",
  },
];

/** The remaining pipeline sub-modules, ported in over the coming turns. */
const PLANNED: string[] = [];

export default async function PipelineHub() {
  await requireModule("pipeline");
  const { config } = await loadCurrentTenant();
  const terms = await loadTerms(config.id);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Growth
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {moduleLabel(terms, "pipeline", "Pipeline & Marketing")}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The new-business engine — leads in, attributed to their sources and
        campaigns, worked up into the opportunity pipeline.
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
            Coming next in the pipeline build-out
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
          ✓ Pipeline &amp; Marketing is fully built out.
        </p>
      )}
    </div>
  );
}
