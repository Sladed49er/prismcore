import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listRetentionRecords } from "@/lib/retention";
import { listRenewals } from "@/lib/renewals";
import {
  RetentionPanel,
  type RetentionRecordDTO,
  type RenewalOption,
} from "@/components/retention-panel";

export default async function RetentionPage() {
  await requireModule("renewals");
  const { config } = await loadCurrentTenant();
  const [recordRows, renewalRows] = await Promise.all([
    listRetentionRecords(config.id),
    listRenewals(config.id),
  ]);

  const records: RetentionRecordDTO[] = recordRows.map((r) => ({
    id: r.id,
    policyNumber: r.policyNumber,
    clientName: r.clientName,
    outcome: r.outcome,
    reasonCode: r.reasonCode,
    priorPremiumCents: r.priorPremiumCents,
    newPremiumCents: r.newPremiumCents,
    recordedDate: r.recordedDate,
  }));
  const renewals: RenewalOption[] = renewalRows.map((r) => ({
    id: r.id,
    label: `${r.policyNumber} — ${r.clientName}`,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/renewals"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Renewals
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Retention Tracking</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The outcome of every renewal — renewed, rewritten, or lost — with the
        reason code, so retention can be measured and acted on.
      </p>
      <RetentionPanel records={records} renewals={renewals} />
    </div>
  );
}
