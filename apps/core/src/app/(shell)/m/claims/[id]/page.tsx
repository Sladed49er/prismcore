import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { clientDisplayName } from "@/lib/clients";
import { loadClaimDetail } from "@/lib/claim-detail";
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

const CLAIM_STATUS: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  investigating: "bg-amber-50 text-amber-700",
  paid: "bg-green-50 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  denied: "bg-rose-50 text-rose-700",
};

/** Claim detail — the full claim file under its policy and insured. */
export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("claims");
  const { id } = await params;
  const { config } = await loadCurrentTenant();
  const detail = await loadClaimDetail(config.id, id);
  if (!detail) notFound();

  const {
    claim,
    policy,
    client,
    notes,
    reserves,
    payments,
    recoveries,
    parties,
    litigation,
  } = detail;
  const attachments = await listAttachments(config.id, "claim", id);

  const paidTotal = payments.reduce((s, p) => s + p.amountCents, 0);
  const recoveredTotal = recoveries.reduce((s, r) => s + r.recoveredCents, 0);

  return (
    <DetailPage>
      <DetailBack href="/m/claims/register" label="Claims Register" />
      <RecordHeader
        eyebrow="Claim"
        title={claim.claimNumber}
        badge={{
          label: claim.status,
          className: CLAIM_STATUS[claim.status] ?? "bg-gray-100 text-gray-500",
        }}
        fields={[
          {
            label: "Policy",
            value: policy ? (
              <Link
                href={`/m/policies/${policy.id}`}
                className="text-indigo-600 hover:underline"
              >
                {policy.policyNumber}
              </Link>
            ) : (
              "—"
            ),
          },
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
          { label: "Date of loss", value: fmtDate(claim.dateOfLoss) },
          { label: "Reserve", value: money(claim.reserveCents) },
          { label: "Paid to date", value: money(paidTotal) },
          { label: "Recovered", value: money(recoveredTotal) },
        ]}
      />

      {claim.description ? (
        <p className="mt-4 rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
          {claim.description}
        </p>
      ) : null}

      <Section
        title="Diary"
        count={notes.length}
        action={{ href: "/m/claims/diary", label: "Manage" }}
      >
        <RecordTable
          rows={notes}
          empty="No diary entries on this claim."
          columns={[
            { label: "Date", cell: (n) => fmtDate(n.noteDate) },
            { label: "Category", cell: (n) => n.category },
            { label: "Note", cell: (n) => n.body },
            { label: "Author", cell: (n) => n.author || "—" },
          ]}
        />
      </Section>

      <Section
        title="Reserve ledger"
        count={reserves.length}
        action={{ href: "/m/claims/reserves", label: "Manage" }}
      >
        <RecordTable
          rows={reserves}
          empty="No reserve changes recorded."
          columns={[
            { label: "Date", cell: (r) => fmtDate(r.entryDate) },
            { label: "Type", cell: (r) => r.reserveType },
            { label: "Change", cell: (r) => money(r.changeCents) },
            { label: "Reason", cell: (r) => r.reason || "—" },
          ]}
        />
      </Section>

      <Section
        title="Payments"
        count={payments.length}
        action={{ href: "/m/claims/payments", label: "Manage" }}
      >
        <RecordTable
          rows={payments}
          empty="No payments issued on this claim."
          columns={[
            { label: "Date", cell: (p) => fmtDate(p.paymentDate) },
            { label: "Payee", cell: (p) => p.payee },
            { label: "Type", cell: (p) => p.paymentType },
            { label: "Amount", cell: (p) => money(p.amountCents) },
            { label: "Check #", cell: (p) => p.checkNumber || "—" },
            { label: "Status", cell: (p) => p.status },
          ]}
        />
      </Section>

      <Section
        title="Recovery & subrogation"
        count={recoveries.length}
        action={{ href: "/m/claims/recoveries", label: "Manage" }}
      >
        <RecordTable
          rows={recoveries}
          empty="No recovery activity."
          columns={[
            { label: "Type", cell: (r) => r.recoveryType },
            { label: "Description", cell: (r) => r.description || "—" },
            { label: "Expected", cell: (r) => money(r.expectedCents) },
            { label: "Recovered", cell: (r) => money(r.recoveredCents) },
            { label: "Status", cell: (r) => r.status },
          ]}
        />
      </Section>

      <Section
        title="Parties"
        count={parties.length}
        action={{ href: "/m/claims/parties", label: "Manage" }}
      >
        <RecordTable
          rows={parties}
          empty="No parties recorded on this claim."
          columns={[
            { label: "Name", cell: (p) => p.name },
            { label: "Role", cell: (p) => p.role },
            { label: "Organization", cell: (p) => p.organization || "—" },
            { label: "Phone", cell: (p) => p.phone || "—" },
            { label: "Email", cell: (p) => p.email || "—" },
          ]}
        />
      </Section>

      <Section
        title="Litigation"
        count={litigation.length}
        action={{ href: "/m/claims/litigation", label: "Manage" }}
      >
        <RecordTable
          rows={litigation}
          empty="No litigation on this claim."
          columns={[
            { label: "Case", cell: (l) => l.caseCaption },
            { label: "Court", cell: (l) => l.court || "—" },
            { label: "Docket", cell: (l) => l.docketNumber || "—" },
            { label: "Defense", cell: (l) => l.defenseAttorney || "—" },
            { label: "Trial date", cell: (l) => fmtDate(l.trialDate) },
            { label: "Status", cell: (l) => l.status },
          ]}
        />
      </Section>

      <section className="mt-7">
        <Attachments
          entityType="claim"
          entityId={id}
          attachments={toAttachmentDTOs(attachments)}
          category="Claim file"
        />
      </section>
    </DetailPage>
  );
}
