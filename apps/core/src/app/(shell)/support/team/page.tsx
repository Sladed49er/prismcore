import Link from "next/link";
import { getCurrentTenant } from "@/lib/current-tenant";
import { listTenantUsers } from "@/lib/tenant-users";

/** The tenant's team roster — RLS-isolated to this one workspace. */
export default async function SupportTeamPage() {
  const tenant = await getCurrentTenant();
  const users = await listTenantUsers(tenant.id);

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/support"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Account
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Team</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The people in the {tenant.name} workspace. To add or remove a team
        member, file a request and the Prism team will take care of it.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {users.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No team members on file yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">
                    {u.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-sm text-gray-400">
        {users.length} member{users.length === 1 ? "" : "s"} ·{" "}
        <Link
          href="/support/requests"
          className="text-indigo-600 transition hover:text-indigo-700"
        >
          Request a team change
        </Link>
      </p>
    </div>
  );
}
