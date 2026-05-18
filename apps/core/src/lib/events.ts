import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  associationEvents,
  eventRegistrations,
  type AssociationEvent,
  type EventRegistration,
} from "@prismcore/db";

/**
 * Events data layer — association events and their registrations.
 * RLS-scoped through `withTenantContext`.
 */

export type { AssociationEvent, EventRegistration };

export type EventRegistrationStatus =
  | "registered"
  | "waitlisted"
  | "attended"
  | "cancelled"
  | "no_show";

export type EventType =
  | "conference"
  | "workshop"
  | "webinar"
  | "meeting"
  | "networking";

export type EventStatus =
  | "planned"
  | "registration_open"
  | "full"
  | "completed"
  | "cancelled";

export async function listEvents(
  tenantId: string,
): Promise<AssociationEvent[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(associationEvents)
      .where(eq(associationEvents.tenantId, tenantId))
      .orderBy(desc(associationEvents.startDate)),
  );
}

export async function createEvent(input: {
  tenantId: string;
  name: string;
  type: EventType;
  startDate: string | null;
  endDate: string | null;
  location: string;
  capacity: number;
  registeredCount: number;
  ceCredits: number;
  feeCents: number;
  status: EventStatus;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(associationEvents).values(input);
  });
}

export async function updateEvent(input: {
  tenantId: string;
  id: string;
  name: string;
  type: EventType;
  startDate: string | null;
  endDate: string | null;
  location: string;
  capacity: number;
  registeredCount: number;
  ceCredits: number;
  feeCents: number;
  status: EventStatus;
  notes: string;
}): Promise<void> {
  const { tenantId, id, ...rest } = input;
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(associationEvents)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(associationEvents.id, id));
  });
}

export async function setEventStatus(input: {
  tenantId: string;
  id: string;
  status: EventStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(associationEvents)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(associationEvents.id, input.id));
  });
}

export async function deleteEvent(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(associationEvents).where(eq(associationEvents.id, id));
  });
}

/* ── Registrations ────────────────────────────────────────────────── */

export interface EventRegistrationRow extends EventRegistration {
  eventName: string;
}

export async function listEventRegistrations(
  tenantId: string,
): Promise<EventRegistrationRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ reg: eventRegistrations, event: associationEvents })
      .from(eventRegistrations)
      .leftJoin(
        associationEvents,
        eq(eventRegistrations.eventId, associationEvents.id),
      )
      .where(eq(eventRegistrations.tenantId, tenantId))
      .orderBy(desc(eventRegistrations.registeredOn));
    return rows.map((r) => ({
      ...r.reg,
      eventName: r.event?.name ?? "—",
    }));
  });
}

export async function createEventRegistration(input: {
  tenantId: string;
  eventId: string;
  attendeeName: string;
  email: string;
  status: EventRegistrationStatus;
  feePaidCents: number;
  registeredOn: string | null;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(eventRegistrations).values(input);
  });
}

export async function setEventRegistrationStatus(input: {
  tenantId: string;
  id: string;
  status: EventRegistrationStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(eventRegistrations)
      .set({ status: input.status })
      .where(eq(eventRegistrations.id, input.id));
  });
}

export async function deleteEventRegistration(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(eventRegistrations)
      .where(eq(eventRegistrations.id, id));
  });
}
