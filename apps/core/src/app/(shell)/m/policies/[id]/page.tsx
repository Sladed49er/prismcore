import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { clientDisplayName } from "@/lib/clients";
import { loadPolicyDetail } from "@/lib/policy-detail";
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

/** Policy detail — a policy with its coverages, endorsements, and claims. */
export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("policies");
  const { id } = await params;
  const { config } = await loadCurrentTenant();
  const detail = await loadPolicyDetail(config.id, id);
  if (!detail) notFound();

  const {
    policy,
    client,
    coverages,
    endorsements,
    claims,
    cancellations,
    installments,
    scheduleItems,
    audits,
    serviceActivities,
    documents,
  } = detail;
  const attachments = await listAttachments(config.id, "policy", id);

  const coveragePremium = coverages.reduce((s, c) => s + c.premiumCents, 0);
  const installmentDue = installments.reduce(
    (s, i) => s + (i.amountCents - i.paidCents),
    0,
  );

  return (
    <DetailPage>
      <DetailBack href="/m/policies/register" label="Policy Register" />
      <RecordHeader
        eyebrow="Policy"
        title={policy.policyNumber}
        badge={{
          label: policy.status,
          className: POLICY_STATUS[policy.status] ?? "bg-gray-100 text-gray-500",
        }}
        fields={[
          {
            label: "Insured",
            value: client ? (
              <Link
                href={`/m/clients/${client.id}`}
                className="text-indigo-600 hover:underline"
              >
                {clientDisplayName(client)}
              </Link>
            ) : (
              "—"
            ),
          },
          { label: "Line of business", value: policy.lineOfBusiness },
          { label: "Carrier", value: policy.carrier },
          { label: "Effective", value: fmtDate(policy.effectiveDate) },
          { label: "Expires", value: fmtDate(policy.expirationDate) },
          { label: "Premium", value: money(policy.premiumCents) },
        ]}
      />

      <Section
        title="Coverages"
        count={coverages.length}
        action={{ href: "/m/policies/coverages", label: "Manage" }}
      >
        <RecordTable
          rows={coverages}
          empty="No coverages recorded on this policy."
          columns={[
            { label: "Coverage", cell: (c) => c.coverageType },
            { label: "Limit", cell: (c) => c.limitText || "—" },
            { label: "Deductible", cell: (c) => money(c.deductibleCents) },
            { label: "Premium", cell: (c) => money(c.premiumCents) },
          ]}
        />
        {coverages.length > 0 ? (
          <p className="mt-2 text-xs text-gray-500">
            Allocated coverage premium: {money(coveragePremium)}
          </p>
        ) : null}
      </Section>

      <Section
        title="Endorsements"
        count={endorsements.length}
        action={{ href: "/m/policies/endorsements", label: "Manage" }}
      >
        <RecordTable
          rows={endorsements}
          empty="No endorsements on this policy."
          columns={[
            { label: "Endorsement #", cell: (e) => e.endorsementNumber },
            { label: "Effective", cell: (e) => fmtDate(e.effectiveDate) },
            { label: "Description", cell: (e) => e.description || "—" },
            {
              label: "Premium change",
              cell: (e) => money(e.premiumChangeCents),
            },
            { label: "Status", cell: (e) => e.status },
          ]}
        />
      </Section>

      <Section title="Claims" count={claims.length}>
        <RecordTable
          rows={claims}
          empty="No claims filed against this policy."
          rowHref={(c) => `/m/claims/${c.id}`}
          columns={[
            { label: "Claim #", cell: (c) => c.claimNumber },
            { label: "Date of loss", cell: (c) => fmtDate(c.dateOfLoss) },
            { label: "Description", cell: (c) => c.description || "—" },
            { label: "Reserve", cell: (c) => money(c.reserveCents) },
            { label: "Status", cell: (c) => pill(c.status, CLAIM_STATUS) },
          ]}
        />
      </Section>

      <Section
        title="Cancellations"
        count={cancellations.length}
        action={{ href: "/m/policies/cancellations", label: "Manage" }}
      >
        <RecordTable
          rows={cancellations}
          empty="No cancellation activity."
          columns={[
            { label: "Requested", cell: (c) => fmtDate(c.requestDate) },
            { label: "Effective", cell: (c) => fmtDate(c.effectiveDate) },
            { label: "Reason", cell: (c) => c.reason || "—" },
            {
              label: "Return premium",
              cell: (c) => money(c.returnPremiumCents),
            },
          ]}
        />
      </Section>

      <Section
        title="Billing installments"
        count={installments.length}
        action={{ href: "/m/policies/installments", label: "Manage" }}
      >
        <RecordTable
          rows={installments}
          empty="No installment schedule."
          columns={[
            { label: "#", cell: (i) => String(i.installmentNumber) },
            { label: "Due", cell: (i) => fmtDate(i.dueDate) },
            { label: "Amount", cell: (i) => money(i.amountCents) },
            { label: "Paid", cell: (i) => money(i.paidCents) },
            {
              label: "Balance",
              cell: (i) => money(i.amountCents - i.paidCents),
            },
          ]}
        />
        {installmentDue > 0 ? (
          <p className="mt-2 text-xs text-gray-500">
            Outstanding installment balance: {money(installmentDue)}
          </p>
        ) : null}
      </Section>

      <Section
        title="Scheduled items"
        count={scheduleItems.length}
        action={{ href: "/m/policies/schedules", label: "Manage" }}
      >
        <RecordTable
          rows={scheduleItems}
          empty="No scheduled items."
          columns={[
            { label: "Description", cell: (s) => s.description },
            { label: "Identifier", cell: (s) => s.identifier || "—" },
            { label: "Value", cell: (s) => money(s.valueCents) },
          ]}
        />
      </Section>

      <Section
        title="Premium audits"
        count={audits.length}
        action={{ href: "/m/policies/audits", label: "Manage" }}
      >
        <RecordTable
          rows={audits}
          empty="No premium audits."
          columns={[
            { label: "Type", cell: (a) => a.auditType },
            {
              label: "Period",
              cell: (a) => `${fmtDate(a.periodStart)} – ${fmtDate(a.periodEnd)}`,
            },
            {
              label: "Estimated",
              cell: (a) => money(a.estimatedPremiumCents),
            },
            { label: "Audited", cell: (a) => money(a.auditedPremiumCents) },
          ]}
        />
      </Section>

      <Section
        title="Service activity"
        count={serviceActivities.length}
        action={{ href: "/m/policies/service", label: "Manage" }}
      >
        <RecordTable
          rows={serviceActivities}
          empty="No service activity logged."
          columns={[
            { label: "Subject", cell: (s) => s.subject },
            { label: "Assigned to", cell: (s) => s.assignedTo || "—" },
            { label: "Due", cell: (s) => fmtDate(s.dueDate) },
          ]}
        />
      </Section>

      <Section
        title="Policy documents"
        count={documents.length}
        action={{ href: "/m/policies/documents", label: "Manage" }}
      >
        <RecordTable
          rows={documents}
          empty="No policy documents recorded."
          columns={[
            { label: "Title", cell: (d) => d.title },
            { label: "Reference", cell: (d) => d.reference || "—" },
            { label: "Issued", cell: (d) => fmtDate(d.issuedDate) },
          ]}
        />
      </Section>

      <section className="mt-7">
        <Attachments
          entityType="policy"
          entityId={id}
          attachments={toAttachmentDTOs(attachments)}
          category="Policy document"
        />
      </section>
    </DetailPage>
  );
}
