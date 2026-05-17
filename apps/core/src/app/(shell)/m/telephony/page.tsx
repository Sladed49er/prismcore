import { headers } from "next/headers";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadTerms, moduleLabel } from "@/lib/terminology";
import { VOIP_PROVIDERS, listConnectionDetails, listCalls } from "@/lib/voip";
import { AMS_PROVIDERS, getAmsConnection } from "@/lib/ams";
import {
  PrismVoicePanel,
  type CallDTO,
  type ConnectionDTO,
} from "@/components/prismvoice-panel";
import {
  AmsConnectionCard,
  type AmsConnectionDTO,
} from "@/components/ams-connection-card";
import { DialpadWebhookCard } from "@/components/dialpad-webhook-card";

/**
 * PrismVoice — the rebuilt CallIntel, now a native Prism Core module. Screen pop,
 * AI call notes, and VoIP provider connections, with no separate app or login.
 */
export default async function PrismVoicePage() {
  await requireModule("telephony");
  const { config } = await loadCurrentTenant();
  const terms = await loadTerms(config.id);

  const [connectionRows, callRows, amsConn, hdrs] = await Promise.all([
    listConnectionDetails(config.id),
    listCalls(config.id),
    getAmsConnection(config.id),
    headers(),
  ]);

  const connections: ConnectionDTO[] = connectionRows.map((c) => ({
    providerId: c.providerId,
    credentials: c.credentials,
  }));
  const calls: CallDTO[] = callRows.map((c) => ({
    id: c.id,
    direction: c.direction,
    fromNumber: c.fromNumber,
    contactName: c.contactName,
    durationSeconds: c.durationSeconds,
    aiSummary: c.aiSummary,
    disposition: c.disposition,
    occurredAt: c.occurredAt.toISOString(),
    amsSyncStatus: c.amsSyncStatus,
  }));

  // The screen-pop credentials never leave the server — only the readable
  // identifiers and toggles do; `hasPassword` tells the form one is stored.
  const ams: AmsConnectionDTO = amsConn
    ? {
        connected: true,
        provider: amsConn.provider,
        endpoint: amsConn.endpoint,
        username: amsConn.username,
        employeeCode: amsConn.employeeCode,
        webTenantId: amsConn.webTenantId,
        autoSyncCalls: amsConn.autoSyncCalls,
        screenPopEnabled: amsConn.screenPopEnabled,
        hasPassword: amsConn.password.length > 0,
      }
    : {
        connected: false,
        provider: "ams360",
        endpoint: "",
        username: "",
        employeeCode: "",
        webTenantId: "",
        autoSyncCalls: true,
        screenPopEnabled: true,
        hasPassword: false,
      };

  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const dialpadConnected = connections.some((c) => c.providerId === "dialpad");
  const webhookUrl = host
    ? `${proto}://${host}/api/voip/webhook/dialpad?tenant=${config.id}`
    : "";

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Communications
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {moduleLabel(terms, "telephony", "PrismVoice")}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The call center, inside Prism. Connect your phone system once — plug in
        the provider credentials and inbound calls screen-pop the caller, log
        themselves, and get an AI summary. No separate app, no separate login.
      </p>
      <PrismVoicePanel
        providers={VOIP_PROVIDERS}
        connections={connections}
        calls={calls}
      />
      <div className="mt-10 space-y-10">
        <DialpadWebhookCard
          connected={dialpadConnected}
          webhookUrl={webhookUrl}
        />
        <AmsConnectionCard providers={AMS_PROVIDERS} connection={ams} />
      </div>
    </div>
  );
}
