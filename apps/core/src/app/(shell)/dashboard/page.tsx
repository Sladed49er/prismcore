import Link from "next/link";
import { loadCurrentTenant } from "@/lib/kernel";

export default async function DashboardPage() {
  const { config, modules } = await loadCurrentTenant();

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-2xl font-semibold">{config.name}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {modules.length} module{modules.length === 1 ? "" : "s"} enabled ·
        workspace &ldquo;{config.slug}&rdquo;
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {modules.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
              {m.category}
            </p>
            <p className="mt-1 font-semibold">{m.name}</p>
            <p className="mt-1 text-sm text-gray-600">{m.description}</p>
          </div>
        ))}
      </div>

      <Link
        href="/compose"
        className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
      >
        Recompose this workspace
      </Link>
    </div>
  );
}
