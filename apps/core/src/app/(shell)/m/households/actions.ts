"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createHousehold,
  updateHousehold,
  setHouseholdStatus,
  deleteHousehold,
  createHouseholdMember,
  updateHouseholdMember,
  deleteHouseholdMember,
  type HouseholdType,
  type HouseholdRiskProfile,
  type HouseholdStatus,
} from "@/lib/households";

const TYPES: HouseholdType[] = ["family", "individual", "trust", "business"];
const RISK: HouseholdRiskProfile[] = [
  "conservative",
  "moderate",
  "aggressive",
];
const STATUSES: HouseholdStatus[] = ["prospect", "active", "inactive"];

export interface HouseholdForm {
  name: string;
  primaryContactName: string;
  advisorName: string;
  type: string;
  aumDollars: string;
  riskProfile: string;
  status: string;
  notes: string;
}

function normalize(form: HouseholdForm) {
  return {
    name: form.name.trim(),
    primaryContactName: form.primaryContactName.trim(),
    advisorName: form.advisorName.trim(),
    type: TYPES.includes(form.type as HouseholdType)
      ? (form.type as HouseholdType)
      : "family",
    aumCents: Math.round((Number.parseFloat(form.aumDollars) || 0) * 100),
    riskProfile: RISK.includes(form.riskProfile as HouseholdRiskProfile)
      ? (form.riskProfile as HouseholdRiskProfile)
      : "moderate",
    status: STATUSES.includes(form.status as HouseholdStatus)
      ? (form.status as HouseholdStatus)
      : "prospect",
    notes: form.notes.trim(),
  };
}

export async function newHousehold(form: HouseholdForm): Promise<void> {
  if (!form.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createHousehold({ tenantId: tenant.id, ...normalize(form) });
  revalidatePath("/m/households");
}

export async function editHousehold(
  input: { id: string } & HouseholdForm,
): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateHousehold({
    tenantId: tenant.id,
    id: input.id,
    ...normalize(input),
  });
  revalidatePath("/m/households");
}

export async function updateHouseholdStatus(input: {
  id: string;
  status: HouseholdStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setHouseholdStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/households");
}

export async function removeHousehold(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteHousehold(tenant.id, id);
  revalidatePath("/m/households");
}

/* ── Household members ────────────────────────────────────────────── */

export interface HouseholdMemberForm {
  householdId: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  isPrimary: boolean;
  notes: string;
}

function normalizeMember(form: HouseholdMemberForm) {
  return {
    householdId: form.householdId,
    name: form.name.trim(),
    relationship: form.relationship.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    dateOfBirth: form.dateOfBirth || null,
    isPrimary: form.isPrimary,
    notes: form.notes.trim(),
  };
}

export async function newMember(form: HouseholdMemberForm): Promise<void> {
  if (!form.householdId || !form.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createHouseholdMember({ tenantId: tenant.id, ...normalizeMember(form) });
  revalidatePath("/m/households");
}

export async function editMember(
  input: { id: string } & HouseholdMemberForm,
): Promise<void> {
  if (!input.householdId || !input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateHouseholdMember({
    tenantId: tenant.id,
    id: input.id,
    ...normalizeMember(input),
  });
  revalidatePath("/m/households");
}

export async function removeMember(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteHouseholdMember(tenant.id, id);
  revalidatePath("/m/households");
}
