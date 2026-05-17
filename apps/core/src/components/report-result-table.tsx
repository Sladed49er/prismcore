"use client";

import type { ReportColumn } from "@/lib/reports/engine";
import { exportRowsToCsv } from "@/lib/csv";

/** Format one cell by its report-column type. */
function formatCell(value: unknown, type: ReportColumn["type"]): string {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "money") {
    return `$${(Number(value) / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (type === "number") return Number(value).toLocaleString();
  if (type === "date") {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  }
  return String(value);
}

/**
 * A report's results — the table both the report builder and the AI report
 * builder render. Presentational: it takes the engine's columns + rows and
 * formats each cell by type, with a CSV export.
 */
export function ReportResultTable({
  columns,
  rows,
}: {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}) {
  if (columns.length === 0 || rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
        No rows — the report ran but matched nothing.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">
          {rows.length} row{rows.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={() =>
            exportRowsToCsv(
              "report",
              columns.map((c) => ({
                header: c.label,
                cell: (r: Record<string, unknown>) => {
                  const v = r[c.key];
                  return v === null || v === undefined ? "" : String(v);
                },
              })),
              rows,
            )
          }
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-semibold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-2.5 ${
                      c.type === "money" || c.type === "number"
                        ? "tabular-nums"
                        : ""
                    }`}
                  >
                    {formatCell(row[c.key], c.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
