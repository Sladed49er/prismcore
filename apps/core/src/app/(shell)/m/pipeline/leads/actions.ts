"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createLead, setLeadStatus, type LeadStatus } from "@/lib/leads";

export async function newLead(input: {
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  lineOfBusiness: string;
  estimatedValueDollars: string;
  notes: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createLead({
    tenantId: tenant.id,
    name: input.name.trim(),
    company: input.company.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    source: input.source.trim(),
    lineOfBusiness: input.lineOfBusiness.trim(),
    estimatedValueCents: Math.round(
      (Number.parseFloat(input.estimatedValueDollars) || 0) * 100,
    ),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/pipeline/leads");
}

export async function updateLeadStatus(input: {
  id: string;
  status: LeadStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setLeadStatus({ tenantId: tenant.id, id: input.id, status: input.status });
  revalidatePath("/m/pipeline/leads");
}
