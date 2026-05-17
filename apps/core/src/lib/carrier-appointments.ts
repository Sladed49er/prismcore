import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  carrierAppointments,
  carriers,
  type CarrierAppointment,
} from "@prismcore/db";

export type { CarrierAppointment };
export type CarrierAppointmentStatus =
  | "active"
  | "pending"
  | "terminated";

export interface CarrierAppointmentRow extends CarrierAppointment {
  carrierName: string;
}

export async function listCarrierAppointments(
  tenantId: string,
): Promise<CarrierAppointmentRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ appt: carrierAppointments, carrier: carriers })
      .from(carrierAppointments)
      .leftJoin(carriers, eq(carrierAppointments.carrierId, carriers.id))
      .where(eq(carrierAppointments.tenantId, tenantId))
      .orderBy(desc(carrierAppointments.createdAt));
    return rows.map((r) => ({
      ...r.appt,
      carrierName: r.carrier?.name ?? "—",
    }));
  });
}

export async function createCarrierAppointment(input: {
  tenantId: string;
  carrierId: string;
  lineOfBusiness: string;
  appointmentNumber: string;
  effectiveDate: string | null;
  commissionRatePercent: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(carrierAppointments).values(input);
  });
}

export async function setCarrierAppointmentStatus(input: {
  tenantId: string;
  id: string;
  status: CarrierAppointmentStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(carrierAppointments)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(carrierAppointments.id, input.id));
  });
}
