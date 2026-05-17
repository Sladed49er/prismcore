import { getRegistry } from "@/lib/registry";
import type { BillingUnit } from "@prismcore/module-sdk";

function formatPrice(cents: number, unit: BillingUnit): string {
  const dollars = (cents / 100).toFixed(0);
  const per =
    unit === "per_user" ? "user" : unit === "per_tenant" ? "agency" : "use";
  return `$${dollars} / ${per} / mo`;
}

export default function Home() {
  const modules = getRegistry().composable();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
        Prism Core
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        Software your way.
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-gray-600">
        The core is not a CRM — it is the composer. Pick only the modules you
        need. The grid below is rendered live from the module registry, the same
        source the composer onboarding will use.
      </p>

      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Composable modules ({modules.length})
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-gray-200 p-5 transition hover:border-indigo-300"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                {m.category}
              </span>
              {m.dependsOn && m.dependsOn.length > 0 ? (
                <span className="text-xs text-gray-400">
                  needs: {m.dependsOn.join(", ")}
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-lg font-semibold">{m.name}</h3>
            <p className="mt-1 text-sm text-gray-600">{m.description}</p>
            {m.pricing ? (
              <p className="mt-3 text-sm font-medium text-gray-900">
                {formatPrice(m.pricing.priceCents, m.pricing.unit)}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
}
