"use client";

import { useState, useTransition } from "react";
import { changeStatus, adminComment } from "@/app/admin/tickets/actions";

export interface AdminTicketDTO {
  id: string;
  tenantId: string;
  tenantName: string;
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

const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
type Status = (typeof STATUSES)[number];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function AdminTicketQueue({
  tickets,
  comments,
}: {
  tickets: AdminTicketDTO[];
  comments: CommentDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function setStatus(ticketId: string, status: Status): void {
    startTransition(async () => {
      await changeStatus(ticketId, status);
    });
  }

  function reply(ticketId: string, tenantId: string): void {
    if (!draft.trim()) return;
    startTransition(async () => {
      await adminComment(ticketId, tenantId, draft);
      setDraft("");
    });
  }

  if (tickets.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
        No tickets from any tenant yet.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {tickets.map((t) => {
        const isOpen = openId === t.id;
        const thread = comments.filter((c) => c.ticketId === t.id);
        return (
          <div key={t.id} className="rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  setOpenId(isOpen ? null : t.id);
                  setDraft("");
                }}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {t.tenantName}
                </span>
                <span className="font-medium">{t.title}</span>
                <span className="text-xs text-gray-400">
                  {t.category} · {t.priority} · {fmtDate(t.createdAt)}
                </span>
              </button>
              <select
                value={t.status}
                onChange={(e) => setStatus(t.id, e.target.value as Status)}
                disabled={pending}
                aria-label="Ticket status"
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            {isOpen ? (
              <div className="border-t border-gray-100 px-5 py-4">
                <p className="text-xs text-gray-400">
                  Filed by {t.createdByName}
                </p>
                {t.description ? (
                  <p className="mt-1 text-sm text-gray-600">{t.description}</p>
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
                    placeholder="Reply as the Prism team…"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => reply(t.id, t.tenantId)}
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
      })}
    </div>
  );
}
