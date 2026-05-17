"use client";

/**
 * Export-CSV button — paired with `exportRowsToCsv` on every list panel so the
 * export affordance looks and behaves the same agency-wide. Disabled when
 * there is nothing to export (e.g. an empty search result).
 */
export function ExportCsvButton({
  onExport,
  disabled,
}: {
  onExport: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled}
      className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
    >
      Export CSV
    </button>
  );
}
