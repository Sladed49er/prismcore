import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listInsights, listComplianceFlags } from "@/lib/voip-intelligence";
import { listDigests } from "@/lib/voip-digest";
import type {
  WeeklyDigestData,
  DigestInsights,
} from "@/lib/voip-digest";
import { listRecentContacts } from "@/lib/voip-caller-brief";
import {
  VoipIntelligencePanel,
  type InsightDTO,
  type FlagDTO,
  type DigestDTO,
} from "@/components/voip-intelligence-panel";

/** Call Intelligence — the AI layer over PrismVoice calls (ported CallIntel). */
export default async function CallIntelligencePage() {
  await requireModule("telephony");
  const { config } = await loadCurrentTenant();
  const [insightRows, flagRows, digestRows, contacts] = await Promise.all([
    listInsights(config.id),
    listComplianceFlags(config.id),
    listDigests(config.id),
    listRecentContacts(config.id),
  ]);

  const insights: InsightDTO[] = insightRows.map((i) => ({
    id: i.id,
    kind: i.kind,
    title: i.title,
    detail: i.detail,
    priority: i.priority,
    estimatedValue: i.estimatedValue,
    productType: i.productType,
    dueDate: i.dueDate,
    contactName: i.contactName,
    status: i.status,
    createdAt: i.createdAt.toISOString(),
  }));
  const flags: FlagDTO[] = flagRows.map((f) => ({
    id: f.id,
    category: f.category,
    severity: f.severity,
    title: f.title,
    detail: f.detail,
    regulation: f.regulation,
    contactName: f.contactName,
    status: f.status,
    createdAt: f.createdAt.toISOString(),
  }));
  const digests: DigestDTO[] = digestRows.map((d) => ({
    id: d.id,
    periodStart: d.periodStart,
    periodEnd: d.periodEnd,
    data: d.data as unknown as WeeklyDigestData,
    insights: d.insights as unknown as DigestInsights,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/telephony"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← PrismVoice
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Call Intelligence</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The AI layer over your calls — revenue opportunities and follow-ups,
        E&amp;O compliance flags, a client risk radar, and a weekly digest.
        Analysis runs over calls that have an AI summary or transcript.
      </p>
      <VoipIntelligencePanel
        insights={insights}
        flags={flags}
        digests={digests}
        contacts={contacts}
      />
    </div>
  );
}
