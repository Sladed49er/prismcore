import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  associationEvents,
  type AssociationEvent,
} from "@prismcore/db";

/**
 * Events data layer — association events (conferences, workshops, webinars).
 * RLS-scoped through `withTenantContext`.
 */

export type { AssociationEvent };

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
