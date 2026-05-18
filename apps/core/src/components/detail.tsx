import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared presentational pieces for per-record detail pages — the drill-down
 * spine (Client → Policy → Claim). Server components; no client state. Every
 * detail page is a back-link, a record header, and a stack of sections, each
 * section a small related-records table that can itself link deeper.
 */

/** Page container — matches the module pages' width and padding. */
export function DetailPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-4xl px-8 py-10">{children}</div>;
}

/** The back link at the top of a detail page. */
export function DetailBack({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm text-gray-400 transition hover:text-gray-600"
    >
      ← {label}
    </Link>
  );
}

/** A label/value pair shown in the record header grid. */
export interface HeaderField {
  label: string;
  value: ReactNode;
}

/** The record header — title, optional status badge, and a field grid. */
export function RecordHeader({
  eyebrow,
  title,
  badge,
  fields,
}: {
  eyebrow?: string;
  title: string;
  badge?: { label: string; className: string };
  fields: HeaderField[];
}) {
  return (
    <div className="mt-3">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
          {eyebrow}
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {badge ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        ) : null}
      </div>
      {fields.length > 0 ? (
        <dl className="mt-4 grid gap-x-8 gap-y-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-3">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {f.label}
              </dt>
              <dd className="mt-0.5 text-sm text-gray-800">
                {f.value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

/** A titled section on a detail page, wrapping a related-records table. */
export function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="mt-7">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {title}
          {count != null ? (
            <span className="ml-1.5 text-gray-400">({count})</span>
          ) : null}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** One column in a {@link RecordTable}. */
export interface Column<T> {
  label: string;
  cell: (row: T) => ReactNode;
}

/**
 * A related-records table for a detail-page section. When `rowHref` is given,
 * each row links into that record's own detail page — the drill-down.
 */
export function RecordTable<T extends { id: string }>({
  columns,
  rows,
  empty,
  rowHref,
}: {
  columns: Column<T>[];
  rows: T[];
  empty: string;
  rowHref?: (row: T) => string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-center text-sm text-gray-500">
        {empty}
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            {columns.map((c) => (
              <th key={c.label} className="px-4 py-2.5 font-semibold">
                {c.label}
              </th>
            ))}
            {rowHref ? <th className="px-4 py-2.5" /> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c, i) => (
                <td
                  key={c.label}
                  className={`px-4 py-2.5 ${i === 0 ? "font-medium" : "text-gray-600"}`}
                >
                  {c.cell(row)}
                </td>
              ))}
              {rowHref ? (
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={rowHref(row)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Open →
                  </Link>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Format integer cents as a dollar string. */
export function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Format an ISO/date string for display, or em-dash when absent. */
export function fmtDate(value: string | Date | null): string {
  if (!value) return "—";
  // A plain YYYY-MM-DD column — render the parts directly so a negative
  // timezone offset never shifts it to the day before.
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (m) return `${MONTHS[+m[2]! - 1]} ${+m[3]!}, ${m[1]}`;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
