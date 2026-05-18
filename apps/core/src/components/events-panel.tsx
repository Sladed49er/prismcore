"use client";

import { useState, useTransition } from "react";
import {
  newEvent,
  editEvent,
  updateEventStatus,
  removeEvent,
  type EventForm,
} from "@/app/(shell)/m/events/actions";

export interface EventDTO {
  id: string;
  name: string;
  type: "conference" | "workshop" | "webinar" | "meeting" | "networking";
  startDate: string | null;
  endDate: string | null;
  location: string;
  capacity: number;
  registeredCount: number;
  ceCredits: number;
  feeCents: number;
  status: "planned" | "registration_open" | "full" | "completed" | "cancelled";
  notes: string;
}

const TYPES = [
  "conference",
  "workshop",
  "webinar",
  "meeting",
  "networking",
] as const;
const STATUSES = [
  "planned",
  "registration_open",
  "full",
  "completed",
  "cancelled",
] as const;

const STATUS_COLOR: Record<EventDTO["status"], string> = {
  planned: "bg-gray-100 text-gray-600",
  registration_open: "bg-emerald-50 text-emerald-700",
  full: "bg-amber-50 text-amber-700",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-rose-50 text-rose-700",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

const EMPTY: EventForm = {
  name: "",
  type: "workshop",
  startDate: "",
  endDate: "",
  location: "",
  capacity: "",
  registeredCount: "",
  ceCredits: "",
  feeDollars: "",
  status: "planned",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function EventsPanel({ events }: { events: EventDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>({ ...EMPTY });

  function set<K extends keyof EventForm>(key: K, value: EventForm[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd(): void {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(e: EventDTO): void {
    setEditId(e.id);
    setForm({
      name: e.name,
      type: e.type,
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      location: e.location,
      capacity: e.capacity ? String(e.capacity) : "",
      registeredCount: e.registeredCount ? String(e.registeredCount) : "",
      ceCredits: e.ceCredits ? String(e.ceCredits) : "",
      feeDollars: e.feeCents ? String(e.feeCents / 100) : "",
      status: e.status,
      notes: e.notes,
    });
    setShowForm(true);
  }

  function submit(): void {
    startTransition(async () => {
      if (editId) await editEvent({ id: editId, ...form });
      else await newEvent(form);
      setForm({ ...EMPTY });
      setEditId(null);
      setShowForm(false);
    });
  }

  function changeStatus(id: string, status: EventDTO["status"]): void {
    startTransition(async () => {
      await updateEventStatus({ id, status });
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this event?")) return;
    startTransition(async () => {
      await removeEvent(id);
    });
  }

  const registered = events.reduce((s, e) => s + e.registeredCount, 0);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {events.length} event{events.length === 1 ? "" : "s"} ·{" "}
          {registered.toLocaleString()} total registrations
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + New event
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Event name
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Type
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className={inputClass}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Start date
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              End date
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Location
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Capacity
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Registered
              <input
                type="number"
                value={form.registeredCount}
                onChange={(e) => set("registeredCount", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              CE credits
              <input
                type="number"
                value={form.ceCredits}
                onChange={(e) => set("ceCredits", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Registration fee ($)
              <input
                type="number"
                value={form.feeDollars}
                onChange={(e) => set("feeDollars", e.target.value)}
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
            <label className={`${labelClass} sm:col-span-2`}>
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
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : editId ? "Save changes" : "Save event"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {events.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No events yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
                <th className="px-4 py-3 font-semibold">Fee</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{e.name}</span>
                    <span className="block text-xs text-gray-500">
                      {[
                        e.type,
                        e.location,
                        e.ceCredits > 0 ? `${e.ceCredits} CE` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.startDate ?? "—"}
                    {e.endDate && e.endDate !== e.startDate
                      ? ` → ${e.endDate}`
                      : ""}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {e.registeredCount.toLocaleString()}
                    {e.capacity > 0 ? (
                      <span className="text-gray-400">
                        {" "}
                        / {e.capacity.toLocaleString()}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {e.feeCents > 0 ? money(e.feeCents) : "Free"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={e.status}
                      disabled={pending}
                      onChange={(ev) =>
                        changeStatus(
                          e.id,
                          ev.target.value as EventDTO["status"],
                        )
                      }
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[e.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(e.id)}
                        disabled={pending}
                        className="text-rose-600 hover:text-rose-800"
                      >
                        Delete
                      </button>
                    </div>
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
