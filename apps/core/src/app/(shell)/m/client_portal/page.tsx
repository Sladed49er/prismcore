import { headers } from "next/headers";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClients, clientDisplayName } from "@/lib/clients";
import { listPortalInvitations } from "@/lib/client-portal";
import {
  ClientPortalPanel,
  type PortalInvitationDTO,
  type PortalClientOption,
} from "@/components/client-portal-panel";

/** The deployment's base URL, from the request headers. */
async function baseUrl(): Promise<string> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "core.prismams.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Client Portal module — the agency-facing side: invite clients, manage their
 * revocable access links, and see when they last viewed the portal. The
 * insured-facing portal itself is the public `/portal/[token]` route.
 */
export default async function ClientPortalPage() {
  await requireModule("client_portal");
  const { config } = await loadCurrentTenant();
  const [invitationRows, clientRows, base] = await Promise.all([
    listPortalInvitations(config.id),
    listClients(config.id),
    baseUrl(),
  ]);

  const invitations: PortalInvitationDTO[] = invitationRows.map((i) => ({
    id: i.id,
    clientName: i.clientName,
    email: i.email,
    token: i.token,
    status: i.status,
    lastViewedAt: i.lastViewedAt ? i.lastViewedAt.toISOString() : null,
  }));

  const clients: PortalClientOption[] = clientRows
    .filter((c) => c.status !== "inactive")
    .map((c) => ({
      id: c.id,
      name: clientDisplayName(c),
      email: c.email ?? "",
    }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Client Portal</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Give insureds a read-only view of their own policies. Each client gets
        a unique, revocable access link — no password to manage.
      </p>
      <ClientPortalPanel
        invitations={invitations}
        clients={clients}
        baseUrl={base}
      />
    </div>
  );
}
