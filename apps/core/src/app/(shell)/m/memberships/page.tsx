import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listMemberships } from "@/lib/memberships";
import {
  MembershipsPanel,
  type MembershipDTO,
} from "@/components/memberships-panel";

/**
 * Memberships module — the association member directory: tiers, dues, and
 * renewal tracking.
 */
export default async function MembershipsPage() {
  await requireModule("memberships");
  const { config } = await loadCurrentTenant();
  const rows = await listMemberships(config.id);

  const members: MembershipDTO[] = rows.map((m) => ({
    id: m.id,
    memberName: m.memberName,
    organization: m.organization,
    tier: m.tier,
    status: m.status,
    joinDate: m.joinDate,
    renewalDate: m.renewalDate,
    duesCents: m.duesCents,
    email: m.email,
    phone: m.phone,
    notes: m.notes,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Association
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Memberships</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The member directory — every member by tier, with dues and renewal
        dates, worked from pending through active and renewed.
      </p>
      <MembershipsPanel members={members} />
    </div>
  );
}
