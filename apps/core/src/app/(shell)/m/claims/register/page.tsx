import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClaims } from "@/lib/claims";
import { listPolicies } from "@/lib/policies";
import { listAttachmentsByEntity } from "@/lib/document-attachments";
import {
  ClaimsPanel,
  type ClaimDTO,
  type PolicyOption,
} from "@/components/claims-panel";
import type { AttachmentDTO } from "@/components/attachments";

/** Claims register — every claim filed against the book. */
export default async function ClaimsRegisterPage() {
  await requireModule("claims");
  const { config } = await loadCurrentTenant();
  const [claimRows, policyRows] = await Promise.all([
    listClaims(config.id),
    listPolicies(config.id),
  ]);

  const claims: ClaimDTO[] = claimRows.map((c) => ({
    id: c.id,
    claimNumber: c.claimNumber,
    policyNumber: c.policyNumber,
    clientName: c.clientName,
    dateOfLoss: c.dateOfLoss,
    status: c.status,
    reserveCents: c.reserveCents,
  }));
  const policies: PolicyOption[] = policyRows.map((p) => ({
    id: p.id,
    label: `${p.policyNumber} — ${p.clientName}`,
  }));

  const attachmentRows = await listAttachmentsByEntity(
    config.id,
    "claim",
    claims.map((c) => c.id),
  );
  const attachments: Record<string, AttachmentDTO[]> = {};
  for (const [claimId, rows] of Object.entries(attachmentRows)) {
    attachments[claimId] = rows.map((a) => ({
      id: a.id,
      documentId: a.documentId,
      name: a.name,
      caption: a.caption,
      storageUrl: a.storageUrl,
      fileSizeBytes: a.fileSizeBytes,
      attachedByName: a.attachedByName,
    }));
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/claims"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Claims
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Claims Register</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Every claim filed against the book — tracked from first notice of loss
        through settlement.
      </p>
      <ClaimsPanel
        claims={claims}
        policies={policies}
        attachments={attachments}
      />
    </div>
  );
}
