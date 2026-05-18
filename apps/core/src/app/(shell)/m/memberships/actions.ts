"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createMembership,
  updateMembership,
  setMembershipStatus,
  deleteMembership,
  type MembershipTier,
  type MembershipStatus,
} from "@/lib/memberships";

const TIERS: MembershipTier[] = [
  "individual",
  "professional",
  "corporate",
  "student",
  "lifetime",
];
const STATUSES: MembershipStatus[] = [
  "active",
  "pending",
  "lapsed",
  "cancelled",
];

export interface MembershipForm {
  memberName: string;
  organization: string;
  tier: string;
  status: string;
  joinDate: string;
  renewalDate: string;
  duesDollars: string;
  email: string;
  phone: string;
  notes: string;
}

function normalize(form: MembershipForm) {
  return {
    memberName: form.memberName.trim(),
    organization: form.organization.trim(),
    tier: TIERS.includes(form.tier as MembershipTier)
      ? (form.tier as MembershipTier)
      : "individual",
    status: STATUSES.includes(form.status as MembershipStatus)
      ? (form.status as MembershipStatus)
      : "pending",
    joinDate: form.joinDate || null,
    renewalDate: form.renewalDate || null,
    duesCents: Math.round((Number.parseFloat(form.duesDollars) || 0) * 100),
    email: form.email.trim(),
    phone: form.phone.trim(),
    notes: form.notes.trim(),
  };
}

export async function newMembership(form: MembershipForm): Promise<void> {
  if (!form.memberName.trim()) return;
  const tenant = await getCurrentTenant();
  await createMembership({ tenantId: tenant.id, ...normalize(form) });
  revalidatePath("/m/memberships");
}

export async function editMembership(
  input: { id: string } & MembershipForm,
): Promise<void> {
  if (!input.memberName.trim()) return;
  const tenant = await getCurrentTenant();
  await updateMembership({
    tenantId: tenant.id,
    id: input.id,
    ...normalize(input),
  });
  revalidatePath("/m/memberships");
}

export async function updateMembershipStatus(input: {
  id: string;
  status: MembershipStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setMembershipStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/memberships");
}

export async function removeMembership(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteMembership(tenant.id, id);
  revalidatePath("/m/memberships");
}
