"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createMemberBenefit,
  updateMemberBenefit,
  setMemberBenefitActive,
  deleteMemberBenefit,
  type MemberBenefitCategory,
} from "@/lib/member-benefits";

const CATEGORIES: MemberBenefitCategory[] = [
  "discount",
  "service",
  "resource",
  "insurance",
  "education",
  "other",
];

export interface MemberBenefitForm {
  name: string;
  partnerName: string;
  category: string;
  description: string;
  redemptionDetails: string;
  url: string;
  notes: string;
}

function normalize(form: MemberBenefitForm) {
  return {
    name: form.name.trim(),
    partnerName: form.partnerName.trim(),
    category: CATEGORIES.includes(form.category as MemberBenefitCategory)
      ? (form.category as MemberBenefitCategory)
      : "discount",
    description: form.description.trim(),
    redemptionDetails: form.redemptionDetails.trim(),
    url: form.url.trim(),
    notes: form.notes.trim(),
  };
}

export async function newMemberBenefit(
  form: MemberBenefitForm,
): Promise<void> {
  if (!form.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createMemberBenefit({ tenantId: tenant.id, ...normalize(form) });
  revalidatePath("/m/member_benefits");
}

export async function editMemberBenefit(
  input: { id: string } & MemberBenefitForm,
): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateMemberBenefit({
    tenantId: tenant.id,
    id: input.id,
    ...normalize(input),
  });
  revalidatePath("/m/member_benefits");
}

export async function toggleMemberBenefitActive(input: {
  id: string;
  isActive: boolean;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setMemberBenefitActive({
    tenantId: tenant.id,
    id: input.id,
    isActive: input.isActive,
  });
  revalidatePath("/m/member_benefits");
}

export async function removeMemberBenefit(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteMemberBenefit(tenant.id, id);
  revalidatePath("/m/member_benefits");
}
