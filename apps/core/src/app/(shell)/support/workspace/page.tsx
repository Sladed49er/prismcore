import Link from "next/link";
import { getCurrentTenant } from "@/lib/current-tenant";
import { loadCurrentTenant } from "@/lib/kernel";

/** The customer's workspace overview — the modules turned on for this tenant. */
export default async function SupportWorkspacePage() {
  const tenant = await getCurrentTenant();
  const { modules } = await loadCurrentTenant();

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/support"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Account
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Workspace</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The modules turned on for {tenant.name}. To add or remove a module,
        file a request — module changes are applied by the Prism team and stay
        scoped to your workspace.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {modules.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500 sm:col-span-2">
            No modules enabled yet.
          </p>
        ) : (
          modules.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <h3 className="font-semibold">{m.name}</h3>
              <p className="mt-1 text-sm text-gray-600">{m.description}</p>
            </div>
          ))
        )}
      </div>
      <p className="mt-3 text-sm text-gray-400">
        {modules.length} module{modules.length === 1 ? "" : "s"} enabled ·{" "}
        <Link
          href="/support/requests"
          className="text-indigo-600 transition hover:text-indigo-700"
        >
          Request a module change
        </Link>
      </p>
    </div>
  );
}
