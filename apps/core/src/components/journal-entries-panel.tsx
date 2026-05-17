"use client";

import { useMemo, useState, useTransition } from "react";
import {
  postJournalEntry,
  removeJournalEntry,
} from "@/app/(shell)/m/accounting/journal-entries/actions";

export interface JournalEntryDTO {
  id: string;
  entryNumber: string;
  entryDate: string | null;
  memo: string;
  totalCents: number;
  lineCount: number;
  status: string;
}

export interface AccountOption {
  id: string;
  label: string;
}

interface DraftLine {
  accountId: string;
  debitDollars: string;
  creditDollars: string;
  lineMemo: string;
}

const BLANK_LINE: DraftLine = {
  accountId: "",
  debitDollars: "",
  creditDollars: "",
  lineMemo: "",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toCents(s: string): number {
  return Math.round((Number.parseFloat(s) || 0) * 100);
}

export function JournalEntriesPanel({
  entries,
  accounts,
}: {
  entries: JournalEntryDTO[];
  accounts: AccountOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [entryNumber, setEntryNumber] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { ...BLANK_LINE },
    { ...BLANK_LINE },
  ]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const l of lines) {
      debit += toCents(l.debitDollars);
      credit += toCents(l.creditDollars);
    }
    return { debit, credit, balanced: debit === credit && debit > 0 };
  }, [lines]);

  function setLine(index: number, key: keyof DraftLine, value: string): void {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [key]: value } : l)),
    );
  }

  function reset(): void {
    setEntryNumber("");
    setEntryDate("");
    setMemo("");
    setLines([{ ...BLANK_LINE }, { ...BLANK_LINE }]);
    setError("");
  }

  function submit(): void {
    setError("");
    startTransition(async () => {
      const result = await postJournalEntry({
        entryNumber,
        entryDate,
        memo,
        lines,
      });
      if (result.ok) {
        reset();
        setShowForm(false);
      } else {
        setError(result.error ?? "Could not post the entry.");
      }
    });
  }

  function remove(e: JournalEntryDTO): void {
    if (
      !confirm(
        `Delete journal entry ${e.entryNumber}? Its ${e.lineCount} line` +
          `${e.lineCount === 1 ? "" : "s"} are removed too. This cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      await removeJournalEntry(e.id);
    });
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? entries.filter((e) =>
        [e.entryNumber, e.memo].join(" ").toLowerCase().includes(q),
      )
    : entries;

  const inputClass =
    "rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entries…"
          className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        {!showForm && accounts.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New journal entry
          </button>
        ) : null}
      </div>

      {accounts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-500">
          Add accounts to the chart of accounts first — journal entry lines post
          to GL accounts.
        </p>
      ) : null}

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={labelClass}>
              Entry number
              <input
                value={entryNumber}
                onChange={(e) => setEntryNumber(e.target.value)}
                className={`mt-1 w-full ${inputClass}`}
              />
            </label>
            <label className={labelClass}>
              Date
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className={`mt-1 w-full ${inputClass}`}
              />
            </label>
            <label className={labelClass}>
              Memo
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className={`mt-1 w-full ${inputClass}`}
              />
            </label>
          </div>

          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="pb-1 font-semibold">Account</th>
                <th className="pb-1 font-semibold">Debit</th>
                <th className="pb-1 font-semibold">Credit</th>
                <th className="pb-1 font-semibold">Memo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <select
                      value={line.accountId}
                      onChange={(e) => setLine(i, "accountId", e.target.value)}
                      className={`w-full ${inputClass}`}
                    >
                      <option value="">Select account…</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      value={line.debitDollars}
                      onChange={(e) =>
                        setLine(i, "debitDollars", e.target.value)
                      }
                      className={`w-28 ${inputClass}`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      value={line.creditDollars}
                      onChange={(e) =>
                        setLine(i, "creditDollars", e.target.value)
                      }
                      className={`w-28 ${inputClass}`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      value={line.lineMemo}
                      onChange={(e) => setLine(i, "lineMemo", e.target.value)}
                      className={`w-full ${inputClass}`}
                    />
                  </td>
                  <td className="py-1">
                    {lines.length > 2 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLines((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="px-1 text-gray-400 transition hover:text-red-600"
                        aria-label="Remove line"
                      >
                        ✕
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <td className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setLines((prev) => [...prev, { ...BLANK_LINE }])
                    }
                    className="text-indigo-600 transition hover:text-indigo-700"
                  >
                    + Add line
                  </button>
                </td>
                <td className="pt-2 text-gray-900">{money(totals.debit)}</td>
                <td className="pt-2 text-gray-900">{money(totals.credit)}</td>
                <td className="pt-2">
                  {totals.balanced ? (
                    <span className="text-green-600">balanced</span>
                  ) : (
                    <span className="text-red-600">out of balance</span>
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>

          {error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !totals.balanced || !entryNumber.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Posting…" : "Post entry"}
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setShowForm(false);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {visible.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {entries.length === 0
              ? "No journal entries yet."
              : "No entries match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Entry #</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Memo</th>
                <th className="px-4 py-3 font-semibold">Lines</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium">{e.entryNumber}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.entryDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.memo || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{e.lineCount}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {money(e.totalCents)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(e)}
                      className="text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
