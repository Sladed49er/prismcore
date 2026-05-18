"use client";

import { useState, useTransition } from "react";
import {
  newRegistration,
  updateRegistrationStatus,
  removeRegistration,
  type EventRegistrationForm,
} from "@/app/(shell)/m/events/actions";

export interface EventRegistrationDTO {
  id: string;
  eventName: string;
  attendeeName: string;
  email: string;
  status: "registered" | "waitlisted" | "attended" | "cancelled" | "no_show";
  feePaidCents: number;
  registeredOn: string | null;
  notes: string;
}

export interface EventOption {
  id: string;
  name: string;
}

const STATUSES = [
  "registered",
  "waitlisted",
  "attended",
  "cancelled",
  "no_show",
] as const;

const STATUS_COLOR: Record<EventRegistrationDTO["status"], string> = {
  registered: "bg-blue-50 text-blue-700",
  waitlisted: "bg-amber-50 text-amber-700",
  attended: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
  no_show: "bg-gray-100 text-gray-500",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY: EventRegistrationForm = {
  eventId: "",
  attendeeName: "",
  email: "",
  status: "registered",
  feeDollars: "",
  registeredOn: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function EventRegistrationsPanel({
  registrations,
  events,
}: {
  registrations: EventRegistrationDTO[];
  events: EventOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventRegistrationForm>({ ...EMPTY });

  function set<K extends keyof EventRegistrationForm>(
    key: K,
    value: EventRegistrationForm[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(): void {
    startTransition(async () => {
      await newRegistration(form);
      setForm({ ...EMPTY });
      setShowForm(false);
    });
  }

  function changeStatus(
    id: string,
    status: EventRegistrationDTO["status"],
  ): void {
    startTransition(async () => {
      await updateRegistrationStatus({ id, status });
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      await removeRegistration(id);
    });
  }

  const collected = registrations.reduce((s, r) => s + r.feePaidCents, 0);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {registrations.length} registration
          {registrations.length === 1 ? "" : "s"} · {money(collected)}{" "}
          collected
        </p>
        {!showForm && events.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            + New registration
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Event
              <select
                value={form.eventId}
                onChange={(e) => set("eventId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select an event…</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Attendee
              <input
                value={form.attendeeName}
                onChange={(e) => set("attendeeName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Email
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Status
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Fee paid ($)
              <input
                type="number"
                value={form.feeDollars}
                onChange={(e) => set("feeDollars", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Registered on
              <input
                type="date"
                value={form.registeredOn}
                onChange={(e) => set("registeredOn", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !form.eventId || !form.attendeeName.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save registration"}
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
        {registrations.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            {events.length === 0
              ? "Add an event first, then its registrations."
              : "No registrations yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Attendee</th>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Fee</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registrations.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{r.attendeeName}</span>
                    {r.email ? (
                      <span className="block text-xs text-gray-400">
                        {r.email}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.eventName}</td>
                  <td className="px-4 py-3 font-medium">
                    {r.feePaidCents > 0 ? money(r.feePaidCents) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={r.status}
                      disabled={pending}
                      onChange={(e) =>
                        changeStatus(
                          r.id,
                          e.target.value as EventRegistrationDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[r.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      disabled={pending}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800"
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
