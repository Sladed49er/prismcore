import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadTerms, moduleLabel } from "@/lib/terminology";

/** Sub-modules that are built and live. */
const BUILT = [
  {
    href: "/m/clients/register",
    name: "Client Register",
    desc: "The CRM record list — with the tenant's own custom fields.",
  },
  {
    href: "/m/clients/contacts",
    name: "Contacts",
    desc: "The people at each account — primary, billing, claims, and more.",
  },
  {
    href: "/m/clients/activities",
    name: "Activities",
    desc: "The interaction log — calls, emails, meetings, and notes.",
  },
  {
    href: "/m/clients/locations",
    name: "Locations",
    desc: "Mailing, physical, billing, and branch addresses per client.",
  },
];

/** The remaining clients sub-modules, ported in over the coming turns. */
const PLANNED: string[] = [];

export default async function ClientsHub() {
  await requireModule("clients");
  const { config } = await loadCurrentTenant();
  const terms = await loadTerms(config.id);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {moduleLabel(terms, "clients", "Clients & CRM")}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The client record at the center of the platform — the register and the
        full CRM around it: contacts, interaction history, and locations.
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
            Coming next in the CRM build-out
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
          ✓ Clients &amp; CRM is fully built out.
        </p>
      )}
    </div>
  );
}
