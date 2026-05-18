"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createContract,
  updateContract,
  setContractStatus,
  deleteContract,
  createContractDocument,
  deleteContractDocument,
  type ContractCategory,
  type ContractStatus,
} from "@/lib/contracts";

const CATEGORIES: ContractCategory[] = [
  "software",
  "services",
  "lease",
  "equipment",
  "insurance",
  "other",
];
const STATUSES: ContractStatus[] = [
  "active",
  "pending",
  "expired",
  "cancelled",
];

function cat(v: string): ContractCategory {
  return CATEGORIES.includes(v as ContractCategory)
    ? (v as ContractCategory)
    : "other";
}
function stat(v: string): ContractStatus {
  return STATUSES.includes(v as ContractStatus)
    ? (v as ContractStatus)
    : "active";
}

export interface ContractForm {
  vendorName: string;
  title: string;
  category: string;
  status: string;
  startDate: string;
  endDate: string;
  annualValueDollars: string;
  autoRenew: boolean;
  noticePeriodDays: string;
  ownerName: string;
  notes: string;
}

function normalize(form: ContractForm) {
  return {
    vendorName: form.vendorName.trim(),
    title: form.title.trim(),
    category: cat(form.category),
    status: stat(form.status),
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    annualValueCents: Math.round(
      (Number.parseFloat(form.annualValueDollars) || 0) * 100,
    ),
    autoRenew: form.autoRenew,
    noticePeriodDays: Math.max(
      0,
      Math.round(Number.parseFloat(form.noticePeriodDays) || 0),
    ),
    ownerName: form.ownerName.trim(),
    notes: form.notes.trim(),
  };
}

export async function newContract(form: ContractForm): Promise<void> {
  if (!form.vendorName.trim()) return;
  const tenant = await getCurrentTenant();
  await createContract({ tenantId: tenant.id, ...normalize(form) });
  revalidatePath("/m/contracts");
}

export async function editContract(
  input: { id: string } & ContractForm,
): Promise<void> {
  if (!input.vendorName.trim()) return;
  const tenant = await getCurrentTenant();
  await updateContract({
    tenantId: tenant.id,
    id: input.id,
    ...normalize(input),
  });
  revalidatePath("/m/contracts");
}

export async function updateContractStatus(input: {
  id: string;
  status: ContractStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setContractStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/contracts");
}

export async function removeContract(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteContract(tenant.id, id);
  revalidatePath("/m/contracts");
}

/* ── Documents ────────────────────────────────────────────────────── */

export interface ContractDocumentForm {
  contractId: string;
  name: string;
  docType: string;
  url: string;
  notes: string;
}

export async function newDocument(
  form: ContractDocumentForm,
): Promise<void> {
  if (!form.contractId || !form.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createContractDocument({
    tenantId: tenant.id,
    contractId: form.contractId,
    name: form.name.trim(),
    docType: form.docType.trim() || "agreement",
    url: form.url.trim(),
    notes: form.notes.trim(),
  });
  revalidatePath("/m/contracts");
}

export async function removeDocument(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteContractDocument(tenant.id, id);
  revalidatePath("/m/contracts");
}
