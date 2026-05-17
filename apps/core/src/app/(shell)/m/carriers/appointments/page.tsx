import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCarrierAppointments } from "@/lib/carrier-appointments";
import { listCarriers } from "@/lib/carriers";
import {
  CarrierAppointmentsPanel,
  type CarrierAppointmentDTO,
  type CarrierOption,
} from "@/components/carrier-appointments-panel";

export default async function CarrierAppointmentsPage() {
  await requireModule("carriers");
  const { config } = await loadCurrentTenant();
  const [apptRows, carrierRows] = await Promise.all([
    listCarrierAppointments(config.id),
    listCarriers(config.id),
  ]);

  const appointments: CarrierAppointmentDTO[] = apptRows.map((a) => ({
    id: a.id,
    carrierName: a.carrierName,
    lineOfBusiness: a.lineOfBusiness,
    appointmentNumber: a.appointmentNumber,
    effectiveDate: a.effectiveDate,
    commissionRatePercent: a.commissionRatePercent,
    status: a.status,
  }));
  const carriers: CarrierOption[] = carrierRows.map((c) => ({
    id: c.id,
    label: c.name,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/carriers"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Carriers
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Appointments</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The agency&rsquo;s carrier appointments — by line of business, with
        appointment numbers and commission rates.
      </p>
      <CarrierAppointmentsPanel
        appointments={appointments}
        carriers={carriers}
      />
    </div>
  );
}
