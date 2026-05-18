import { notFound } from "next/navigation";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { clientDisplayName } from "@/lib/clients";
import { loadClientDetail } from "@/lib/client-detail";
import { listAttachments } from "@/lib/document-attachments";
import { Attachments, type AttachmentDTO } from "@/components/attachments";
import {
  DetailPage,
  DetailBack,
  RecordHeader,
  Section,
  RecordTable,
  money,
  fmtDate,
} from "@/components/detail";

/** Flatten attachment rows to the shape the <Attachments> component wants. */
function toAttachmentDTOs(
  rows: Awaited<ReturnType<typeof listAttachments>>,
): AttachmentDTO[] {
  return rows.map((a) => ({
    id: a.id,
    documentId: a.documentId,
    name: a.name,
    caption: a.caption,
    storageUrl: a.storageUrl,
    fileSizeBytes: a.fileSizeBytes,
    attachedByName: a.attachedByName,
  }));
}

const CLIENT_STATUS: Record<string, string> = {
  prospect: "bg-amber-50 text-amber-700",
  active: "bg-green-50 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
};
const POLICY_STATUS: Record<string, string> = {
  quoted: "bg-amber-50 text-amber-700",
  active: "bg-green-50 text-green-700",
  expired: "bg-gray-100 text-gray-500",
  cancelled: "bg-rose-50 text-rose-700",
};
const CLAIM_STATUS: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  investigating: "bg-amber-50 text-amber-700",
  paid: "bg-green-50 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  denied: "bg-rose-50 text-rose-700",
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

/** Client detail — the insured record with every policy, claim, and contact. */
export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("clients");
  const { id } = await params;
  const { config } = await loadCurrentTenant();
  const detail = await loadClientDetail(config.id, id);
  if (!detail) notFound();

  const { client, policies, claims, contacts, locations, activities } = detail;
  const attachments = await listAttachments(config.id, "client", id);
  const name = clientDisplayName(client);
  const activePremium = policies
    .filter((p) => p.status === "active")
    .reduce((s, p) => s + p.premiumCents, 0);

  return (
    <DetailPage>
      <DetailBack href="/m/clients/register" label="Client Register" />
      <RecordHeader
        eyebrow={client.type === "business" ? "Business account" : "Personal account"}
        title={name}
        badge={{
          label: client.status,
          className: CLIENT_STATUS[client.status] ?? "bg-gray-100 text-gray-500",
        }}
        fields={[
          { label: "Email", value: client.email },
          { label: "Phone", value: client.phone },
          {
            label: "Location",
            value: [client.city, client.state].filter(Boolean).join(", "),
          },
          { label: "Policies", value: String(policies.length) },
          { label: "In-force premium", value: money(activePremium) },
          { label: "Open claims", value: String(claims.filter((c) => c.status === "open").length) },
        ]}
      />

      <Section
        title="Policies"
        count={policies.length}
        action={{ href: "/m/policies/register", label: "Policy register" }}
      >
        <RecordTable
          rows={policies}
          empty="No policies on this client yet."
          rowHref={(p) => `/m/policies/${p.id}`}
          columns={[
            { label: "Policy #", cell: (p) => p.policyNumber },
            { label: "Line", cell: (p) => p.lineOfBusiness || "—" },
            { label: "Carrier", cell: (p) => p.carrier || "—" },
            { label: "Premium", cell: (p) => money(p.premiumCents) },
            { label: "Expires", cell: (p) => fmtDate(p.expirationDate) },
            { label: "Status", cell: (p) => pill(p.status, POLICY_STATUS) },
          ]}
        />
      </Section>

      <Section title="Claims" count={claims.length}>
        <RecordTable
          rows={claims}
          empty="No claims filed on this client's policies."
          rowHref={(c) => `/m/claims/${c.id}`}
          columns={[
            { label: "Claim #", cell: (c) => c.claimNumber },
            { label: "Policy", cell: (c) => c.policyNumber },
            { label: "Date of loss", cell: (c) => fmtDate(c.dateOfLoss) },
            { label: "Reserve", cell: (c) => money(c.reserveCents) },
            { label: "Status", cell: (c) => pill(c.status, CLAIM_STATUS) },
          ]}
        />
      </Section>

      <Section
        title="Contacts"
        count={contacts.length}
        action={{ href: "/m/clients/contacts", label: "Manage" }}
      >
        <RecordTable
          rows={contacts}
          empty="No contacts recorded."
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
        title="Locations"
        count={locations.length}
        action={{ href: "/m/clients/locations", label: "Manage" }}
      >
        <RecordTable
          rows={locations}
          empty="No locations recorded."
          columns={[
            { label: "Label", cell: (l) => l.label || l.locationType },
            { label: "Type", cell: (l) => l.locationType },
            { label: "Address", cell: (l) => l.addressLine || "—" },
            {
              label: "City / State",
              cell: (l) => [l.city, l.state].filter(Boolean).join(", ") || "—",
            },
            { label: "Postal", cell: (l) => l.postalCode || "—" },
          ]}
        />
      </Section>

      <Section
        title="Activity"
        count={activities.length}
        action={{ href: "/m/clients/activities", label: "Manage" }}
      >
        <RecordTable
          rows={activities}
          empty="No activity logged."
          columns={[
            { label: "Subject", cell: (a) => a.subject },
            { label: "Type", cell: (a) => a.activityType },
            { label: "Date", cell: (a) => fmtDate(a.activityDate) },
            { label: "Author", cell: (a) => a.author || "—" },
          ]}
        />
      </Section>

      <section className="mt-7">
        <Attachments
          entityType="client"
          entityId={id}
          attachments={toAttachmentDTOs(attachments)}
          category="Correspondence"
        />
      </section>
    </DetailPage>
  );
}
