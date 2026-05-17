import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadTerms, moduleLabel } from "@/lib/terminology";
import {
  seedCarriers,
  listCarriers,
  listConnections,
} from "@/lib/clearinghouse";
import {
  ClearinghouseBrowser,
  type CarrierDTO,
} from "@/components/clearinghouse-browser";

/**
 * The API Clearinghouse — a real module page that replaces the generic shell.
 * This is how a module is "poured in": its route gets a dedicated page while the
 * `[module]` catch-all still serves every other module.
 */
export default async function ClearinghousePage() {
  await requireModule("api_clearinghouse");
  await seedCarriers();

  const { config } = await loadCurrentTenant();
  const terms = await loadTerms(config.id);
  const [carriers, connectedIds] = await Promise.all([
    listCarriers(),
    listConnections(config.id),
  ]);

  const dto: CarrierDTO[] = carriers.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    description: c.description,
    lines: c.lines,
    states: c.states,
    appetite: c.appetite,
    apiStatus: c.apiStatus,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Integration
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {moduleLabel(terms, "api_clearinghouse", "API Clearinghouse")}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        One connection, every market. Browse carriers and MGAs in the shared
        pool — no SDK licensing fees, no per-call charges. Connect what you need;
        every market added to Prism joins the pool for everyone.
      </p>
      <ClearinghouseBrowser carriers={dto} connectedIds={connectedIds} />
    </div>
  );
}
