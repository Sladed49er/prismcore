"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createSpecialtyMarket,
  updateSpecialtyMarket,
  setSpecialtyMarketActive,
  deleteSpecialtyMarket,
  type SpecialtyMarketType,
} from "@/lib/specialty-markets";
import {
  matchSpecialtyMarkets,
  type MarketMatchResult,
} from "@/lib/specialty-markets-assistant";

const TYPES: SpecialtyMarketType[] = [
  "mga",
  "wholesaler",
  "surplus_carrier",
  "program",
  "other",
];

function marketType(v: string): SpecialtyMarketType {
  return TYPES.includes(v as SpecialtyMarketType)
    ? (v as SpecialtyMarketType)
    : "mga";
}

export interface MarketForm {
  name: string;
  marketType: string;
  appetite: string;
  linesOfBusiness: string;
  states: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  notes: string;
}

function normalize(form: MarketForm) {
  return {
    name: form.name.trim(),
    marketType: marketType(form.marketType),
    appetite: form.appetite.trim(),
    linesOfBusiness: form.linesOfBusiness.trim(),
    states: form.states.trim(),
    contactName: form.contactName.trim(),
    contactEmail: form.contactEmail.trim(),
    contactPhone: form.contactPhone.trim(),
    website: form.website.trim(),
    notes: form.notes.trim(),
  };
}

export async function newMarket(form: MarketForm): Promise<void> {
  if (!form.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createSpecialtyMarket({ tenantId: tenant.id, ...normalize(form) });
  revalidatePath("/m/specialty_markets");
}

export async function editMarket(
  input: { id: string } & MarketForm,
): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateSpecialtyMarket({
    tenantId: tenant.id,
    id: input.id,
    ...normalize(input),
  });
  revalidatePath("/m/specialty_markets");
}

export async function toggleMarketActive(input: {
  id: string;
  isActive: boolean;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setSpecialtyMarketActive({
    tenantId: tenant.id,
    id: input.id,
    isActive: input.isActive,
  });
  revalidatePath("/m/specialty_markets");
}

export async function removeMarket(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteSpecialtyMarket(tenant.id, id);
  revalidatePath("/m/specialty_markets");
}

/** AI market match — read-only, returns ranked results for the UI. */
export async function findMarkets(
  riskDescription: string,
): Promise<MarketMatchResult> {
  const tenant = await getCurrentTenant();
  return matchSpecialtyMarkets(tenant.id, riskDescription);
}
