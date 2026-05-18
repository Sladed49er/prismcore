import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listEvents, listEventRegistrations } from "@/lib/events";
import { EventsPanel, type EventDTO } from "@/components/events-panel";
import {
  EventRegistrationsPanel,
  type EventRegistrationDTO,
  type EventOption,
} from "@/components/event-registrations-panel";

/**
 * Events module — association events and their individual registrations.
 */
export default async function EventsPage() {
  await requireModule("events");
  const { config } = await loadCurrentTenant();
  const [eventRows, registrationRows] = await Promise.all([
    listEvents(config.id),
    listEventRegistrations(config.id),
  ]);

  const events: EventDTO[] = eventRows.map((e) => ({
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

  const registrations: EventRegistrationDTO[] = registrationRows.map((r) => ({
    id: r.id,
    eventName: r.eventName,
    attendeeName: r.attendeeName,
    email: r.email,
    status: r.status,
    feePaidCents: r.feePaidCents,
    registeredOn: r.registeredOn,
    notes: r.notes,
  }));

  const eventOptions: EventOption[] = eventRows.map((e) => ({
    id: e.id,
    name: e.name,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Association
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Events</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Conferences, workshops, webinars, and meetings — and the individual
        registrants for each.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Events</h2>
      <EventsPanel events={events} />

      <h2 className="mt-10 text-lg font-semibold">Registrations</h2>
      <p className="mt-1 text-sm text-gray-500">
        Every registrant, by event, worked from registered through attended.
      </p>
      <EventRegistrationsPanel
        registrations={registrations}
        events={eventOptions}
      />
    </div>
  );
}
