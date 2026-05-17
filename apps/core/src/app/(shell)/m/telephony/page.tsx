import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { VOIP_PROVIDERS, listConnections, listCalls } from "@/lib/voip";
import {
  PrismVoicePanel,
  type CallDTO,
} from "@/components/prismvoice-panel";

/**
 * PrismVoice — the rebuilt CallIntel, now a native Prism Core module. Screen pop,
 * AI call notes, and VoIP provider connections, with no separate app or login.
 */
export default async function PrismVoicePage() {
  await requireModule("telephony");
  const { config } = await loadCurrentTenant();

  const [connectedIds, callRows] = await Promise.all([
    listConnections(config.id),
    listCalls(config.id),
  ]);

  const calls: CallDTO[] = callRows.map((c) => ({
    id: c.id,
    direction: c.direction,
    fromNumber: c.fromNumber,
    contactName: c.contactName,
    durationSeconds: c.durationSeconds,
    aiSummary: c.aiSummary,
    disposition: c.disposition,
    occurredAt: c.occurredAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Communications
      </p>
      <h1 className="mt-1 text-2xl font-semibold">PrismVoice</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The call center, inside Prism. Connect your phone system once — inbound
        calls screen-pop the caller, log themselves, and get an AI summary. No
        separate app, no separate login.
      </p>
      <PrismVoicePanel
        providers={VOIP_PROVIDERS}
        connectedIds={connectedIds}
        calls={calls}
      />
    </div>
  );
}
