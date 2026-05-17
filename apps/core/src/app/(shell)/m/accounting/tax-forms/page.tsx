import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { taxReport } from "@/lib/tax-reporting";

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

export default async function TaxFormsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();

  const now = new Date().getFullYear();
  const years = [now, now - 1, now - 2].map(String);
  const { year: rawYear } = await searchParams;
  const year = rawYear && years.includes(rawYear) ? rawYear : String(now);

  const report = await taxReport(config.id, year);

  const cardClass = "rounded-xl border border-gray-200 bg-white";
  const headClass =
    "border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500";

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">1099 / W-2 Reporting</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Year-end wage and non-employee-compensation totals — W-2 wages from
        posted payroll, 1099-NEC from contractor pay and paid bills to
        1099-flagged vendors.
      </p>

      <div className="mt-5 flex gap-2">
        {years.map((y) => (
          <Link
            key={y}
            href={`/m/accounting/tax-forms?year=${y}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              y === year
                ? "bg-indigo-600 text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            W-2 — wages &amp; tax withheld
          </h2>
          <span className="text-sm text-gray-500">
            {money(report.totalW2WagesCents)} wages ·{" "}
            {money(report.totalW2TaxCents)} withheld
          </span>
        </div>
        <div className={`mt-2 overflow-hidden ${cardClass}`}>
          {report.w2.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              No W-2 wages posted for {year}.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className={headClass}>
                <tr>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Box 1 — wages</th>
                  <th className="px-4 py-3 font-semibold">
                    Box 2 — fed. tax withheld
                  </th>
                  <th className="px-4 py-3 font-semibold">Net pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.w2.map((r) => (
                  <tr key={r.employeeId}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.name}</span>
                      {r.title ? (
                        <span className="ml-2 text-xs text-gray-400">
                          {r.title}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {money(r.wagesCents)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {money(r.taxWithheldCents)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {money(r.netCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            1099-NEC — non-employee compensation
          </h2>
          <span className="text-sm text-gray-500">
            {money(report.total1099Cents)} total
          </span>
        </div>
        <div className={`mt-2 overflow-hidden ${cardClass}`}>
          {report.form1099.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              No 1099-reportable payments for {year}. Flag a vendor as 1099 on
              the Vendors page, or add contractor employees in Payroll.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className={headClass}>
                <tr>
                  <th className="px-4 py-3 font-semibold">Recipient</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">
                    Box 1 — compensation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.form1099.map((r, i) => (
                  <tr key={`${r.source}-${r.name}-${i}`}>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.source}</td>
                    <td className="px-4 py-3 font-medium">
                      {money(r.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
