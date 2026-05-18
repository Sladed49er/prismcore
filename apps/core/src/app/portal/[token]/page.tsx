import { getPortalView } from "@/lib/client-portal";

/** Token-authenticated — always rendered fresh, never cached or prerendered. */
export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  quoted: "bg-blue-50 text-blue-700",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "bg-rose-50 text-rose-700",
};

function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString();
}

/**
 * The insured-facing client portal — a read-only policy summary reached
 * through a per-client access token. Public route (see `middleware.ts`); the
 * token is the credential and the agency can revoke it at any time.
 */
export default async function ClientPortalView({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getPortalView(token);

  if (!view) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">
            This link isn&rsquo;t valid
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            This portal link has expired or been revoked. Please contact your
            insurance agency for an up-to-date link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
          {view.agencyName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
          Your policies
        </h1>
        <p className="mt-1 text-gray-600">
          Welcome, {view.clientName}. Here is a summary of your coverage on
          file.
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {view.policies.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">
              No policies are on file yet. Please contact {view.agencyName} with
              any questions.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Policy</th>
                  <th className="px-4 py-3 font-semibold">Carrier</th>
                  <th className="px-4 py-3 font-semibold">Term</th>
                  <th className="px-4 py-3 font-semibold">Premium</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {view.policies.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {p.lineOfBusiness || "Policy"}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {p.policyNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.carrier || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.effectiveDate ?? "—"}
                      {p.expirationDate ? ` → ${p.expirationDate}` : ""}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {money(p.premiumCents)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          This is a read-only summary. To make changes, contact{" "}
          {view.agencyName} directly.
        </p>
      </div>
    </main>
  );
}
