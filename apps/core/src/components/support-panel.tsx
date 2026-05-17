"use client";

import { useState, useTransition } from "react";
import {
  submitTicket,
  commentOnTicket,
} from "@/app/(shell)/support/requests/actions";

export interface TicketDTO {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  createdByName: string;
  createdAt: string;
}

export interface CommentDTO {
  id: string;
  ticketId: string;
  body: string;
  authorName: string;
  fromAdmin: boolean;
  createdAt: string;
}

const CATEGORIES = [
  "Question",
  "Bug",
  "Feature request",
  "Change request",
  "Other",
];
const PRIORITIES = ["low", "normal", "high"] as const;

const STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  resolved: "bg-green-50 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

function statusLabel(s: string): string {
  return s.replace("_", " ");
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function SupportPanel({
  tickets,
  comments,
}: {
  tickets: TicketDTO[];
  comments: CommentDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Question");
  const [priority, setPriority] =
    useState<(typeof PRIORITIES)[number]>("normal");
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState("");

  function create(): void {
    if (!title.trim()) return;
    startTransition(async () => {
      await submitTicket({ title, description, category, priority });
      setTitle("");
      setDescription("");
      setCategory("Question");
      setPriority("normal");
      setShowForm(false);
    });
  }

  function comment(ticketId: string): void {
    if (!draft.trim()) return;
    startTransition(async () => {
      await commentOnTicket(ticketId, draft);
      setDraft("");
    });
  }

  return (
    <div className="mt-6">
      {showForm ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">New request</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary"
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as (typeof PRIORITIES)[number])
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p} priority
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you need…"
            rows={4}
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={create}
              disabled={pending || !title.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              Submit request
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
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          + New request
        </button>
      )}

      <div className="mt-6 space-y-3">
        {tickets.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No requests yet.
          </p>
        ) : (
          tickets.map((t) => {
            const isOpen = openId === t.id;
            const thread = comments.filter((c) => c.ticketId === t.id);
            return (
              <div
                key={t.id}
                className="rounded-xl border border-gray-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(isOpen ? null : t.id);
                    setDraft("");
                  }}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[t.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {statusLabel(t.status)}
                    </span>
                    <span className="font-medium">{t.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {t.category} · {fmtDate(t.createdAt)}
                  </span>
                </button>
                {isOpen ? (
                  <div className="border-t border-gray-100 px-5 py-4">
                    {t.description ? (
                      <p className="text-sm text-gray-600">{t.description}</p>
                    ) : null}
                    <div className="mt-3 space-y-2">
                      {thread.map((c) => (
                        <div
                          key={c.id}
                          className={`rounded-lg px-3 py-2 text-sm ${c.fromAdmin ? "bg-indigo-50" : "bg-gray-50"}`}
                        >
                          <span className="font-medium">
                            {c.fromAdmin
                              ? `${c.authorName} · Prism team`
                              : c.authorName}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">
                            {fmtDate(c.createdAt)}
                          </span>
                          <p className="mt-0.5 text-gray-600">{c.body}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Add a comment…"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => comment(t.id)}
                        disabled={pending || !draft.trim()}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
