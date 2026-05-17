"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createCarrierAppointment,
  setCarrierAppointmentStatus,
  type CarrierAppointmentStatus,
} from "@/lib/carrier-appointments";

export async function newCarrierAppointment(input: {
  carrierId: string;
  lineOfBusiness: string;
  appointmentNumber: string;
  effectiveDate: string;
  commissionRatePercent: string;
  notes: string;
}): Promise<void> {
  if (!input.carrierId) return;
  const tenant = await getCurrentTenant();
  await createCarrierAppointment({
    tenantId: tenant.id,
    carrierId: input.carrierId,
    lineOfBusiness: input.lineOfBusiness.trim(),
    appointmentNumber: input.appointmentNumber.trim(),
    effectiveDate: input.effectiveDate || null,
    commissionRatePercent: input.commissionRatePercent.trim(),
    notes: input.notes.trim(),
  });
  revalidatePath("/m/carriers/appointments");
}

export async function updateAppointmentStatus(input: {
  id: string;
  status: CarrierAppointmentStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setCarrierAppointmentStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/carriers/appointments");
}
