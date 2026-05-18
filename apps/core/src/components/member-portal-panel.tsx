"use client";

import { useState, useTransition } from "react";
import {
  inviteMember,
  revokeMember,
  deleteMember,
} from "@/app/(shell)/m/member_portal/actions";

export interface MemberPortalInvitationDTO {
  id: string;
  memberName: string;
  email: string;
  token: string;
  status: "invited" | "active" | "revoked";
  lastViewedAt: string | null;
}

export interface MemberOption {
  id: string;
  name: string;
  email: string;
}

const STATUS_COLOR: Record<MemberPortalInvitationDTO["status"], string> = {
  invited: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  revoked: "bg-gray-100 text-gray-500",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function MemberPortalPanel({
  invitations,
  members,
  baseUrl,
}: {
  invitations: MemberPortalInvitationDTO[];
  members: MemberOption[];
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [membershipId, setMembershipId] = useState("");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function portalUrl(token: string): string {
    return `${baseUrl}/member-portal/${token}`;
  }

  function selectMember(id: string): void {
    setMembershipId(id);
    const m = members.find((x) => x.id === id);
    if (m && m.email) setEmail(m.email);
  }

  function submit(): void {
    const member = members.find((m) => m.id === membershipId);
    if (!member) return;
    startTransition(async () => {
      await inviteMember({
        membershipId,
        memberName: member.name,
        email,
      });
      setMembershipId("");
      setEmail("");
      setShowForm(false);
    });
  }

  function copy(token: string): void {
    startTransition(async () => {
      await navigator.clipboard.writeText(portalUrl(token));
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500);
    });
  }

  function revoke(id: string): void {
    if (!confirm("Revoke this member's portal access?")) return;
    startTransition(async () => {
      await revokeMember(id);
    });
  }

  function remove(id: string): void {
    if (!confirm("Delete this portal invitation?")) return;
    startTransition(async () => {
      await deleteMember(id);
    });
  }

  const activeCount = invitations.filter((i) => i.status !== "revoked").length;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {activeCount} member{activeCount === 1 ? "" : "s"} with portal access
        </p>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Invite a member
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Member
              <select
                value={membershipId}
                onChange={(e) => selectMember(e.target.value)}
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
              Email (for your records)
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            A unique, revocable access link is generated — share it with the
            member so they can view their membership, benefits, and events. No
            password required.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending || !membershipId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {pending ? "Generating…" : "Generate access link"}
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
        {invitations.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No members invited to the portal yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last viewed</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invitations.map((i) => (
                <tr key={i.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium">{i.memberName}</span>
                    {i.email ? (
                      <span className="block text-xs text-gray-400">
                        {i.email}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[i.status]}`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {i.lastViewedAt
                      ? new Date(i.lastViewedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-semibold">
                      {i.status !== "revoked" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => copy(i.token)}
                            disabled={pending}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            {copied === i.token ? "Copied!" : "Copy link"}
                          </button>
                          <button
                            type="button"
                            onClick={() => revoke(i.id)}
                            disabled={pending}
                            className="text-amber-700 hover:text-amber-900"
                          >
                            Revoke
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => remove(i.id)}
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
