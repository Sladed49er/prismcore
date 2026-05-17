"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createProducer,
  setProducerStatus,
  type ProducerStatus,
} from "@/lib/producers";

export async function newProducer(input: {
  name: string;
  code: string;
  email: string;
  defaultRatePercent: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createProducer({
    tenantId: tenant.id,
    name: input.name.trim(),
    code: input.code.trim(),
    email: input.email.trim(),
    defaultRatePercent: input.defaultRatePercent.trim(),
  });
  revalidatePath("/m/commissions/producers");
}

export async function updateProducerStatus(input: {
  id: string;
  status: ProducerStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setProducerStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/commissions/producers");
}
