/**
 * Client-side CSV export.
 *
 * Prism Core is daily software for the agency, so every list needs to leave
 * the app — to an accountant, a carrier, a spreadsheet. The list panels
 * already hold their (filtered) rows in memory; `exportRowsToCsv` turns those
 * into a downloaded `.csv` with no server round-trip.
 */

export interface CsvColumn<T> {
  header: string;
  /** Cell value for a row — numbers and nullish are coerced to text. */
  cell: (row: T) => string | number | null | undefined;
}

/** RFC 4180 field escaping — quote anything with a comma, quote, or newline. */
function escapeField(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build a CSV from `rows` and trigger a browser download. The leading BOM
 * makes Excel read UTF-8 correctly. A timestamp is appended to the filename
 * so repeated exports don't collide.
 */
export function exportRowsToCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[],
): void {
  const lines = [
    columns.map((c) => escapeField(c.header)).join(","),
    ...rows.map((row) =>
      columns.map((c) => escapeField(c.cell(row))).join(","),
    ),
  ];
  const blob = new Blob(["﻿" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const base = filename.replace(/\.csv$/i, "");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${base}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
