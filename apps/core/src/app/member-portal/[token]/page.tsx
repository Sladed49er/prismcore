import { getMemberPortalView } from "@/lib/member-portal";

/** Token-authenticated — always rendered fresh, never cached or prerendered. */
export const dynamic = "force-dynamic";

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

/**
 * The member-facing portal — a read-only view of a member's membership,
 * benefits, and upcoming events, reached through a per-member access token.
 * Public route (see `middleware.ts`); the token is the credential and the
 * association can revoke it at any time.
 */
export default async function MemberPortalView({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getMemberPortalView(token);

  if (!view) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">
            This link isn&rsquo;t valid
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            This portal link has expired or been revoked. Please contact your
            association for an up-to-date link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
          {view.associationName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
          Member Portal
        </h1>
        <p className="mt-1 text-gray-600">Welcome, {view.memberName}.</p>

        {/* Membership */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-700">
            Your membership
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Tier</p>
              <p className="font-semibold capitalize">
                {view.membership.tier}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="font-semibold capitalize">
                {view.membership.status}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Renews</p>
              <p className="font-semibold">
                {view.membership.renewalDate ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Annual dues</p>
              <p className="font-semibold">
                {money(view.membership.duesCents)}
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <h2 className="mt-8 text-lg font-semibold text-gray-900">
          Member benefits
        </h2>
        {view.benefits.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No member benefits are published yet.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {view.benefits.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{b.name}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {b.category}
                  </span>
                </div>
                {b.partnerName ? (
                  <p className="text-xs text-gray-500">{b.partnerName}</p>
                ) : null}
                {b.description ? (
                  <p className="mt-1 text-sm text-gray-600">
                    {b.description}
                  </p>
                ) : null}
                {b.redemptionDetails ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Redeem: {b.redemptionDetails}
                  </p>
                ) : null}
                {b.url ? (
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-xs text-indigo-600 hover:underline"
                  >
                    {b.url}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {/* Events */}
        <h2 className="mt-8 text-lg font-semibold text-gray-900">
          Upcoming events
        </h2>
        {view.events.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No upcoming events are scheduled.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {view.events.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{e.name}</span>
                      <span className="block text-xs text-gray-500">
                        {[e.type, e.location].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {e.startDate ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {e.feeCents > 0 ? money(e.feeCents) : "Free"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          This is a read-only summary. To make changes, contact{" "}
          {view.associationName} directly.
        </p>
      </div>
    </main>
  );
}
