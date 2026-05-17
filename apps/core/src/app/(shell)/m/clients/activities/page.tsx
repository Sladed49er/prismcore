import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClientActivities } from "@/lib/client-activities";
import { listClients, clientDisplayName } from "@/lib/clients";
import {
  ClientActivitiesPanel,
  type ClientActivityDTO,
  type ClientOption,
} from "@/components/client-activities-panel";

export default async function ClientActivitiesPage() {
  await requireModule("clients");
  const { config } = await loadCurrentTenant();
  const [activityRows, clientRows] = await Promise.all([
    listClientActivities(config.id),
    listClients(config.id),
  ]);

  const activities: ClientActivityDTO[] = activityRows.map((a) => ({
    id: a.id,
    clientName: a.clientName,
    activityType: a.activityType,
    subject: a.subject,
    detail: a.detail,
    activityDate: a.activityDate,
    author: a.author,
  }));
  const clients: ClientOption[] = clientRows.map((c) => ({
    id: c.id,
    label: clientDisplayName(c),
  }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/m/clients"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Clients
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Activities</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The interaction log — every call, email, meeting, and note on a client,
        in one chronological feed.
      </p>
      <ClientActivitiesPanel activities={activities} clients={clients} />
    </div>
  );
}
