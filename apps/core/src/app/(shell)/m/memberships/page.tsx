import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listMemberships, listMembershipPayments } from "@/lib/memberships";
import {
  MembershipsPanel,
  type MembershipDTO,
} from "@/components/memberships-panel";
import {
  MembershipPaymentsPanel,
  type MembershipPaymentDTO,
  type MemberOption,
} from "@/components/membership-payments-panel";

/**
 * Memberships module — the association member directory and each member's
 * dues-payment history.
 */
export default async function MembershipsPage() {
  await requireModule("memberships");
  const { config } = await loadCurrentTenant();
  const [memberRows, paymentRows] = await Promise.all([
    listMemberships(config.id),
    listMembershipPayments(config.id),
  ]);

  const members: MembershipDTO[] = memberRows.map((m) => ({
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

  const payments: MembershipPaymentDTO[] = paymentRows.map((p) => ({
    id: p.id,
    memberName: p.memberName,
    amountCents: p.amountCents,
    paymentDate: p.paymentDate,
    method: p.method,
    period: p.period,
    notes: p.notes,
  }));

  const memberOptions: MemberOption[] = memberRows.map((m) => ({
    id: m.id,
    name: m.memberName,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Association
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Memberships</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The member directory and the dues collected against it.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Members</h2>
      <MembershipsPanel members={members} />

      <h2 className="mt-10 text-lg font-semibold">Dues payments</h2>
      <p className="mt-1 text-sm text-gray-500">
        Every dues payment recorded against a member.
      </p>
      <MembershipPaymentsPanel payments={payments} members={memberOptions} />
    </div>
  );
}
