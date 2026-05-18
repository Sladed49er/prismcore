import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClients, clientDisplayName } from "@/lib/clients";
import {
  listSequences,
  listTemplates,
  listEnrollments,
  listSends,
} from "@/lib/marketing-engine";
import {
  MarketingSequencesPanel,
  type SequenceDTO,
  type TemplateOption,
  type ClientOption,
  type EnrollmentDTO,
  type SendDTO,
} from "@/components/marketing-sequences-panel";

/** Marketing drip sequences — multi-step template sends with day delays. */
export default async function MarketingSequencesPage() {
  await requireModule("marketing");
  const { config } = await loadCurrentTenant();
  const [seqRows, tplRows, clientRows, enrollRows, sendRows] =
    await Promise.all([
      listSequences(config.id),
      listTemplates(config.id),
      listClients(config.id),
      listEnrollments(config.id),
      listSends(config.id),
    ]);

  const sequences: SequenceDTO[] = seqRows.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    steps: s.steps,
  }));
  const templates: TemplateOption[] = tplRows.map((t) => ({
    id: t.id,
    name: t.name,
  }));
  const clients: ClientOption[] = clientRows.map((c) => ({
    id: c.id,
    name: clientDisplayName(c),
  }));
  const enrollments: EnrollmentDTO[] = enrollRows.map((e) => ({
    id: e.id,
    sequenceName: e.sequenceName,
    clientName: e.clientName,
    status: e.status,
    currentStep: e.currentStep,
    nextSendAt: e.nextSendAt ? e.nextSendAt.toISOString() : null,
  }));
  const sends: SendDTO[] = sendRows
    .filter((s) => s.source === "sequence")
    .map((s) => ({
      id: s.id,
      toEmail: s.toEmail,
      subject: s.subject,
      source: s.source,
      status: s.status,
      sentAt: s.sentAt.toISOString(),
    }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/m/marketing"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Marketing
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Drip Sequences</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Multi-step email sequences — each step sends a template a set number of
        days after the prior. Enrolled clients are advanced daily.
      </p>
      <MarketingSequencesPanel
        sequences={sequences}
        templates={templates}
        clients={clients}
        enrollments={enrollments}
        sends={sends}
      />
    </div>
  );
}
