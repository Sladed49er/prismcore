"use client";

import { Fragment, useState, useTransition } from "react";
import {
  runAnnualDues,
  addInvoice,
  payInvoice,
  voidInvoice,
} from "@/app/(shell)/m/memberships/dues/actions";

export interface DuesInvoiceDTO {
  id: string;
  memberName: string;
  periodLabel: string;
  amountCents: number;
  paidCents: number;
  balanceCents: number;
  dueDate: string | null;
  status: string;
  overdue: boolean;
}
export interface MemberOption {
  id: string;
  name: string;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

export function MembershipDuesPanel({
  invoices,
  members,
}: {
  invoices: DuesInvoiceDTO[];
  members: MemberOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  // Annual run.
  const [annualPeriod, setAnnualPeriod] = useState("");
  const [annualDue, setAnnualDue] = useState("");

  // Single invoice.
  const [memberId, setMemberId] = useState("");
  const [period, setPeriod] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");

  // Payment.
  const [payId, setPayId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("check");
  const [payDate, setPayDate] = useState("");

  function annual(): void {
    setStatus(null);
    startTransition(async () => {
      const r = await runAnnualDues(annualPeriod, annualDue);
      setStatus(r.message);
      if (r.ok) setAnnualPeriod("");
    });
  }

  function single(): void {
    if (!memberId || !period.trim()) return;
    startTransition(async () => {
      await addInvoice({
        membershipId: memberId,
        periodLabel: period,
        amountDollars: amount,
        dueDate: due,
      });
      setMemberId("");
      setPeriod("");
      setAmount("");
      setDue("");
    });
  }

  function pay(invoiceId: string): void {
    setStatus(null);
    startTransition(async () => {
      const r = await payInvoice({
        invoiceId,
        amountDollars: payAmount,
        method: payMethod,
        paymentDate: payDate,
      });
      setStatus(r.message);
      if (r.ok) {
        setPayId(null);
        setPayAmount("");
        setPayDate("");
      }
    });
  }

  return (
    <div className="mt-6 space-y-7">
      {status ? (
        <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          {status}
        </p>
      ) : null}

      {/* Annual dues run */}
      <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
        <p className="text-sm font-semibold text-indigo-900">
          Generate annual dues
        </p>
        <p className="mt-0.5 text-xs text-indigo-700">
          Raises one invoice per active member, billing each member&rsquo;s own
          dues amount. Members already invoiced for the period are skipped.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className={labelClass}>
            Period label
            <input
              value={annualPeriod}
              onChange={(e) => setAnnualPeriod(e.target.value)}
              placeholder="2026 Annual Dues"
              className="mt-1 w-52 rounded-lg border border-indigo-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label className={labelClass}>
            Due date
            <input
              type="date"
              value={annualDue}
              onChange={(e) => setAnnualDue(e.target.value)}
              className="mt-1 rounded-lg border border-indigo-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <button
            type="button"
            onClick={annual}
            disabled={pending || !annualPeriod.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            Generate
          </button>
        </div>
      </section>

      {/* Single invoice */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold">Raise a single invoice</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Member
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Period label
            <input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Amount ($)
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Due date
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={single}
          disabled={pending || !memberId || !period.trim()}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
        >
          Raise invoice
        </button>
      </section>

      {/* Invoices */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Dues invoices
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {invoices.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              No dues invoices yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Member</th>
                  <th className="px-4 py-2.5 font-semibold">Period</th>
                  <th className="px-4 py-2.5 font-semibold">Amount</th>
                  <th className="px-4 py-2.5 font-semibold">Balance</th>
                  <th className="px-4 py-2.5 font-semibold">Due</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <Fragment key={inv.id}>
                    <tr>
                      <td className="px-4 py-2.5 font-medium">
                        {inv.memberName}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {inv.periodLabel}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {money(inv.amountCents)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {money(inv.balanceCents)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {inv.dueDate ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            inv.status === "paid"
                              ? "bg-green-50 text-green-700"
                              : inv.status === "void"
                                ? "bg-gray-100 text-gray-400"
                                : inv.overdue
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {inv.status === "open" && inv.overdue
                            ? "overdue"
                            : inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {inv.status === "open" ? (
                          <span className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setPayId(payId === inv.id ? null : inv.id);
                                setPayAmount(
                                  (inv.balanceCents / 100).toFixed(2),
                                );
                              }}
                              className="text-xs font-semibold text-green-700 hover:underline"
                            >
                              Record payment
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                startTransition(async () => {
                                  await voidInvoice(inv.id);
                                })
                              }
                              disabled={pending}
                              className="text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
                            >
                              Void
                            </button>
                          </span>
                        ) : null}
                      </td>
                    </tr>
                    {payId === inv.id ? (
                      <tr>
                        <td colSpan={7} className="bg-gray-50 px-4 py-3">
                          <div className="flex flex-wrap items-end gap-2">
                            <label className={labelClass}>
                              Amount ($)
                              <input
                                type="number"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                className="mt-1 w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                              />
                            </label>
                            <label className={labelClass}>
                              Method
                              <select
                                value={payMethod}
                                onChange={(e) => setPayMethod(e.target.value)}
                                className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                              >
                                {["check", "card", "ach", "cash", "other"].map(
                                  (m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>
                            <label className={labelClass}>
                              Date
                              <input
                                type="date"
                                value={payDate}
                                onChange={(e) => setPayDate(e.target.value)}
                                className="mt-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => pay(inv.id)}
                              disabled={pending}
                              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
                            >
                              Save payment
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
