"use client";

import { useState, useTransition } from "react";
import {
  newCarrierAppointment,
  updateAppointmentStatus,
} from "@/app/(shell)/m/carriers/appointments/actions";

export interface CarrierOption {
  id: string;
  label: string;
}

export interface CarrierAppointmentDTO {
  id: string;
  carrierName: string;
  lineOfBusiness: string;
  appointmentNumber: string;
  effectiveDate: string | null;
  commissionRatePercent: string;
  status: "active" | "pending" | "terminated";
}

const STATUS_COLOR: Record<CarrierAppointmentDTO["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  terminated: "bg-rose-50 text-rose-700",
};

const EMPTY = {
  carrierId: "",
  lineOfBusiness: "",
  appointmentNumber: "",
  effectiveDate: "",
  commissionRatePercent: "",
  notes: "",
};

export function CarrierAppointmentsPanel({
  appointments,
  carriers,
}: {
  appointments: CarrierAppointmentDTO[];
  carriers: CarrierOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  function set(key: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newCarrierAppointment(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: CarrierAppointmentDTO["status"],
  ): void {
    startTransition(async () => {
      await updateAppointmentStatus({ id, status });
    });
  }

  const active = appointments.filter((a) => a.status === "active").length;
  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {appointments.length} appointment
          {appointments.length === 1 ? "" : "s"} · {active} active
        </p>
        {!showForm && carriers.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New appointment
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Carrier
              <select
                value={form.carrierId}
                onChange={(e) => set("carrierId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a carrier…</option>
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Line of business
              <input
                value={form.lineOfBusiness}
                onChange={(e) => set("lineOfBusiness", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Appointment number
              <input
                value={form.appointmentNumber}
                onChange={(e) => set("appointmentNumber", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Effective date
              <input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => set("effectiveDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Commission rate (%)
              <input
                type="number"
                value={form.commissionRatePercent}
                onChange={(e) =>
                  set("commissionRatePercent", e.target.value)
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Notes
              <input
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.carrierId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save appointment"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {appointments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {carriers.length === 0
              ? "Add a carrier first, then record its appointments."
              : "No carrier appointments yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Carrier</th>
                <th className="px-4 py-3 font-semibold">Line</th>
                <th className="px-4 py-3 font-semibold">Appt #</th>
                <th className="px-4 py-3 font-semibold">Comm. rate</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium">{a.carrierName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.lineOfBusiness || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.appointmentNumber || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {a.commissionRatePercent
                      ? `${a.commissionRatePercent}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          a.id,
                          e.target.value as CarrierAppointmentDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[a.status]}`}
                    >
                      <option value="active">active</option>
                      <option value="pending">pending</option>
                      <option value="terminated">terminated</option>
                    </select>
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
