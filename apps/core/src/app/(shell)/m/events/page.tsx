import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listEvents } from "@/lib/events";
import { EventsPanel, type EventDTO } from "@/components/events-panel";

/**
 * Events module — association events: conferences, workshops, webinars, and
 * meetings, with registration, capacity, and CE-credit tracking.
 */
export default async function EventsPage() {
  await requireModule("events");
  const { config } = await loadCurrentTenant();
  const rows = await listEvents(config.id);

  const events: EventDTO[] = rows.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    startDate: e.startDate,
    endDate: e.endDate,
    location: e.location,
    capacity: e.capacity,
    registeredCount: e.registeredCount,
    ceCredits: e.ceCredits,
    feeCents: e.feeCents,
    status: e.status,
    notes: e.notes,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Association
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Events</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Conferences, workshops, webinars, and meetings — tracked by
        registration, capacity, continuing-education credits, and fees.
      </p>
      <EventsPanel events={events} />
    </div>
  );
}
