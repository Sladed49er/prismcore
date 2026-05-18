"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createTaxEngagement,
  updateTaxEngagement,
  setTaxEngagementStatus,
  deleteTaxEngagement,
  type TaxEngagementType,
  type TaxEngagementStatus,
} from "@/lib/tax-practice";

const TYPES: TaxEngagementType[] = [
  "form_1040",
  "form_1120",
  "form_1120s",
  "form_1065",
  "form_990",
  "other",
];
const STATUSES: TaxEngagementStatus[] = [
  "not_started",
  "in_progress",
  "in_review",
  "filed",
  "extended",
];

export interface TaxEngagementForm {
  clientName: string;
  taxYear: string;
  engagementType: string;
  status: string;
  dueDate: string;
  feeDollars: string;
  preparerName: string;
  notes: string;
}

function normalize(form: TaxEngagementForm) {
  const year = Math.round(Number.parseFloat(form.taxYear) || 0);
  return {
    clientName: form.clientName.trim(),
    taxYear: year > 0 ? year : new Date().getFullYear(),
    engagementType: TYPES.includes(form.engagementType as TaxEngagementType)
      ? (form.engagementType as TaxEngagementType)
      : "form_1040",
    status: STATUSES.includes(form.status as TaxEngagementStatus)
      ? (form.status as TaxEngagementStatus)
      : "not_started",
    dueDate: form.dueDate || null,
    feeCents: Math.round((Number.parseFloat(form.feeDollars) || 0) * 100),
    preparerName: form.preparerName.trim(),
    notes: form.notes.trim(),
  };
}

export async function newTaxEngagement(
  form: TaxEngagementForm,
): Promise<void> {
  if (!form.clientName.trim()) return;
  const tenant = await getCurrentTenant();
  await createTaxEngagement({ tenantId: tenant.id, ...normalize(form) });
  revalidatePath("/m/tax_practice");
}

export async function editTaxEngagement(
  input: { id: string } & TaxEngagementForm,
): Promise<void> {
  if (!input.clientName.trim()) return;
  const tenant = await getCurrentTenant();
  await updateTaxEngagement({
    tenantId: tenant.id,
    id: input.id,
    ...normalize(input),
  });
  revalidatePath("/m/tax_practice");
}

export async function updateTaxEngagementStatus(input: {
  id: string;
  status: TaxEngagementStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setTaxEngagementStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/tax_practice");
}

export async function removeTaxEngagement(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteTaxEngagement(tenant.id, id);
  revalidatePath("/m/tax_practice");
}
