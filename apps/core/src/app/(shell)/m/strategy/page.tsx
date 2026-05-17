import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadTerms, moduleLabel } from "@/lib/terminology";
import { loadStrategyDashboard } from "@/lib/strategy/dashboard";
import { buildModelDescriptor } from "@/lib/reports/descriptor";
import { StrategyDashboard } from "@/components/strategy-dashboard";

/**
 * Strategy Monitor — the live KPI board. Every metric with its current value,
 * target, trend, and status; the rules watching them; and any open alerts.
 * Metrics are scalar reports, so everything is structured and RLS-scoped.
 */
export default async function StrategyPage() {
  await requireModule("strategy");
  const { config } = await loadCurrentTenant();
  const terms = await loadTerms(config.id);

  const data = await loadStrategyDashboard(config.id);
  const model = buildModelDescriptor();

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {moduleLabel(terms, "strategy", "Strategy Monitor")}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Your agency&rsquo;s numbers, watched against the plan. Define the
        metrics that matter, set targets, and add rules that flag what&rsquo;s
        off track.
      </p>
      <StrategyDashboard
        model={model}
        metrics={data.metrics}
        rules={data.rules}
        alerts={data.alerts}
      />
    </div>
  );
}
