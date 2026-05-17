import { notFound } from "next/navigation";
import { requireModule } from "@/lib/kernel";
import { getRegistry } from "@/lib/registry";

/**
 * Generic module page. Every catalog module routes here via `/m/{id}` until its
 * full PrismAMS implementation is poured in. `requireModule` enforces route→module
 * gating: if the current tenant has not enabled this module, it 404s.
 */
export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  await requireModule(module);

  const def = getRegistry().get(module);
  if (!def) notFound();

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        {def.category}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">{def.name}</h1>
      <p className="mt-2 text-gray-600">{def.description}</p>
      <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
        Module shell. This module is registered with the kernel and enabled for the
        workspace. Its PrismAMS service and schema pour in onto the module-SDK
        contract — the kernel, shell, and composer do not change when it does.
      </div>
    </div>
  );
}
