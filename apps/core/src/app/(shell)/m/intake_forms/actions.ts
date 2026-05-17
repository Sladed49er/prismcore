"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createIntake, setIntakeStatus, type IntakeStatus } from "@/lib/intake";

export async function addIntake(input: {
  name: string;
  email: string;
  phone: string;
  interest: string;
  status: IntakeStatus;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createIntake({
    tenantId: tenant.id,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    interest: input.interest.trim(),
    status: input.status,
  });
  revalidatePath("/m/intake_forms");
}

export async function advanceIntake(
  submissionId: string,
  status: IntakeStatus,
): Promise<void> {
  const tenant = await getCurrentTenant();
  await setIntakeStatus(tenant.id, submissionId, status);
  revalidatePath("/m/intake_forms");
}
