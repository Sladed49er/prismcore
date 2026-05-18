import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCarriers } from "@/lib/carriers";
import { computeScorecards } from "@/lib/carrier-scorecard";
import { listAppetiteRules } from "@/lib/carrier-appetite";
import {
  CarrierAppetitePanel,
  type CarrierOption,
  type RuleDTO,
} from "@/components/carrier-appetite-panel";

function money(cents: number): string {
  return "$" + Math.round(cents / 100).toLocaleString();
}

/** Carrier Intelligence — performance scorecards and NAICS appetite matching. */
export default async function CarrierIntelligencePage() {
  await requireModule("carriers");
  const { config } = await loadCurrentTenant();
  const [scorecards, carrierRows, ruleRows] = await Promise.all([
    computeScorecards(config.id),
    listCarriers(config.id),
    listAppetiteRules(config.id),
  ]);

  const carriers: CarrierOption[] = carrierRows.map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const rules: RuleDTO[] = ruleRows.map((r) => ({
    id: r.id,
    carrierName: r.carrierName,
    naicsPrefix: r.naicsPrefix,
    appetite: r.appetite,
    lineOfBusiness: r.lineOfBusiness,
    notes: r.notes,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/carriers"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Carriers
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Carrier Intelligence</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Per-carrier performance — premium, loss ratio, and commission variance
        across the book — and NAICS appetite matching to find the right market
        for a risk.
      </p>

      {/* ── Scorecard ──────────────────────────────────────────────── */}
      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Carrier scorecard
      </h2>
      <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {scorecards.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No carriers in the directory yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Carrier</th>
                <th className="px-4 py-2.5 font-semibold">Policies</th>
                <th className="px-4 py-2.5 font-semibold">In-force premium</th>
                <th className="px-4 py-2.5 font-semibold">Claims</th>
                <th className="px-4 py-2.5 font-semibold">Loss ratio</th>
                <th className="px-4 py-2.5 font-semibold">Comm. variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scorecards.map((s) => (
                <tr key={s.carrierId}>
                  <td className="px-4 py-2.5 font-medium">
                    <Link
                      href={`/m/carriers/${s.carrierId}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {s.carrierName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {s.activePolicies} active / {s.policyCount}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {money(s.totalPremiumCents)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {s.openClaims} open / {s.claimCount}
                  </td>
                  <td className="px-4 py-2.5">
                    {s.lossRatio === null ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span
                        className={
                          s.lossRatio >= 70
                            ? "font-medium text-rose-600"
                            : s.lossRatio >= 50
                              ? "font-medium text-amber-600"
                              : "font-medium text-green-700"
                        }
                      >
                        {s.lossRatio}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {money(s.commissionVarianceCents)}
                    {s.commissionExpectedCents > 0 ? (
                      <span className="text-xs text-gray-400">
                        {" "}
                        ({money(s.commissionReceivedCents)} /{" "}
                        {money(s.commissionExpectedCents)})
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-1.5 text-xs text-gray-400">
        Loss ratio is incurred loss (paid + reserved) over in-force premium.
      </p>

      {/* ── Appetite ───────────────────────────────────────────────── */}
      <CarrierAppetitePanel carriers={carriers} rules={rules} />
    </div>
  );
}
