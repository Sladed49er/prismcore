"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createEvent,
  updateEvent,
  setEventStatus,
  deleteEvent,
  type EventType,
  type EventStatus,
} from "@/lib/events";

const TYPES: EventType[] = [
  "conference",
  "workshop",
  "webinar",
  "meeting",
  "networking",
];
const STATUSES: EventStatus[] = [
  "planned",
  "registration_open",
  "full",
  "completed",
  "cancelled",
];

function int(v: string): number {
  return Math.max(0, Math.round(Number.parseFloat(v) || 0));
}

export interface EventForm {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  location: string;
  capacity: string;
  registeredCount: string;
  ceCredits: string;
  feeDollars: string;
  status: string;
  notes: string;
}

function normalize(form: EventForm) {
  return {
    name: form.name.trim(),
    type: TYPES.includes(form.type as EventType)
      ? (form.type as EventType)
      : "workshop",
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    location: form.location.trim(),
    capacity: int(form.capacity),
    registeredCount: int(form.registeredCount),
    ceCredits: int(form.ceCredits),
    feeCents: Math.round((Number.parseFloat(form.feeDollars) || 0) * 100),
    status: STATUSES.includes(form.status as EventStatus)
      ? (form.status as EventStatus)
      : "planned",
    notes: form.notes.trim(),
  };
}

export async function newEvent(form: EventForm): Promise<void> {
  if (!form.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createEvent({ tenantId: tenant.id, ...normalize(form) });
  revalidatePath("/m/events");
}

export async function editEvent(
  input: { id: string } & EventForm,
): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateEvent({ tenantId: tenant.id, id: input.id, ...normalize(input) });
  revalidatePath("/m/events");
}

export async function updateEventStatus(input: {
  id: string;
  status: EventStatus;
}): Promise<void> {
  const tenant = await getCurrentTenant();
  await setEventStatus({
    tenantId: tenant.id,
    id: input.id,
    status: input.status,
  });
  revalidatePath("/m/events");
}

export async function removeEvent(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteEvent(tenant.id, id);
  revalidatePath("/m/events");
}
