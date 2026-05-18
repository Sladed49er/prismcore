import { notFound } from "next/navigation";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadCarrierDetail } from "@/lib/carrier-detail";
import {
  DetailPage,
  DetailBack,
  RecordHeader,
  Section,
  RecordTable,
  money,
  fmtDate,
} from "@/components/detail";

const CARRIER_STATUS: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  prospective: "bg-amber-50 text-amber-700",
  inactive: "bg-gray-100 text-gray-500",
};
const POLICY_STATUS: Record<string, string> = {
  quoted: "bg-amber-50 text-amber-700",
  active: "bg-green-50 text-green-700",
  expired: "bg-gray-100 text-gray-500",
  cancelled: "bg-rose-50 text-rose-700",
};

function pill(value: string, map: Record<string, string>) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[value] ?? "bg-gray-100 text-gray-500"}`}
    >
      {value}
    </span>
  );
}

/** Carrier detail — appointments, contacts, guidelines, and placed policies. */
export default async function CarrierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("carriers");
  const { id } = await params;
  const { config } = await loadCurrentTenant();
  const detail = await loadCarrierDetail(config.id, id);
  if (!detail) notFound();

  const { carrier, appointments, contacts, guidelines, policies } = detail;
  const inForcePremium = policies
    .filter((p) => p.status === "active")
    .reduce((s, p) => s + p.premiumCents, 0);

  return (
    <DetailPage>
      <DetailBack href="/m/carriers/directory" label="Carrier Directory" />
      <RecordHeader
        eyebrow="Carrier"
        title={carrier.name}
        badge={{
          label: carrier.status,
          className:
            CARRIER_STATUS[carrier.status] ?? "bg-gray-100 text-gray-500",
        }}
        fields={[
          { label: "NAIC code", value: carrier.naicCode },
          { label: "Appetite", value: carrier.appetite },
          { label: "Contact", value: carrier.contactName },
          { label: "Email", value: carrier.contactEmail },
          { label: "Phone", value: carrier.contactPhone },
          { label: "In-force premium", value: money(inForcePremium) },
        ]}
      />

      {carrier.notes ? (
        <p className="mt-4 rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
          {carrier.notes}
        </p>
      ) : null}

      <Section
        title="Appointments"
        count={appointments.length}
        action={{ href: "/m/carriers/appointments", label: "Manage" }}
      >
        <RecordTable
          rows={appointments}
          empty="No appointments with this carrier."
          columns={[
            { label: "Line of business", cell: (a) => a.lineOfBusiness || "—" },
            { label: "Appointment #", cell: (a) => a.appointmentNumber || "—" },
            { label: "Effective", cell: (a) => fmtDate(a.effectiveDate) },
            {
              label: "Commission",
              cell: (a) =>
                a.commissionRatePercent ? `${a.commissionRatePercent}%` : "—",
            },
            { label: "Status", cell: (a) => a.status },
          ]}
        />
      </Section>

      <Section
        title="Contacts"
        count={contacts.length}
        action={{ href: "/m/carriers/contacts", label: "Manage" }}
      >
        <RecordTable
          rows={contacts}
          empty="No carrier contacts recorded."
          columns={[
            { label: "Name", cell: (c) => c.name },
            { label: "Title", cell: (c) => c.title || "—" },
            { label: "Role", cell: (c) => c.role },
            { label: "Email", cell: (c) => c.email || "—" },
            { label: "Phone", cell: (c) => c.phone || "—" },
          ]}
        />
      </Section>

      <Section
        title="Underwriting guidelines"
        count={guidelines.length}
        action={{ href: "/m/carriers/guidelines", label: "Manage" }}
      >
        <RecordTable
          rows={guidelines}
          empty="No underwriting guidelines on file."
          columns={[
            { label: "Title", cell: (g) => g.title },
            { label: "Line of business", cell: (g) => g.lineOfBusiness || "—" },
            { label: "Status", cell: (g) => g.status },
          ]}
        />
      </Section>

      <Section title="Policies placed" count={policies.length}>
        <RecordTable
          rows={policies}
          empty="No policies placed with this carrier."
          rowHref={(p) => `/m/policies/${p.id}`}
          columns={[
            { label: "Policy #", cell: (p) => p.policyNumber },
            { label: "Line", cell: (p) => p.lineOfBusiness || "—" },
            { label: "Premium", cell: (p) => money(p.premiumCents) },
            { label: "Expires", cell: (p) => fmtDate(p.expirationDate) },
            { label: "Status", cell: (p) => pill(p.status, POLICY_STATUS) },
          ]}
        />
      </Section>
    </DetailPage>
  );
}
