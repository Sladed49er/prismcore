import { desc, eq } from "drizzle-orm";
import {
  adminDb,
  tickets,
  ticketComments,
  type Ticket,
  type TicketComment,
} from "@prismcore/db";

export type { Ticket, TicketComment };
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high";

/** A single tenant's tickets — the siloed view. */
export async function listTickets(tenantId: string): Promise<Ticket[]> {
  return adminDb()
    .select()
    .from(tickets)
    .where(eq(tickets.tenantId, tenantId))
    .orderBy(desc(tickets.createdAt));
}

/** Comments across a single tenant's tickets. */
export async function listTicketComments(
  tenantId: string,
): Promise<TicketComment[]> {
  return adminDb()
    .select()
    .from(ticketComments)
    .where(eq(ticketComments.tenantId, tenantId))
    .orderBy(ticketComments.createdAt);
}

/** Every tenant's tickets — platform-admin view only. */
export async function listAllTickets(): Promise<Ticket[]> {
  return adminDb().select().from(tickets).orderBy(desc(tickets.createdAt));
}

export async function listAllTicketComments(): Promise<TicketComment[]> {
  return adminDb()
    .select()
    .from(ticketComments)
    .orderBy(ticketComments.createdAt);
}

export async function createTicket(input: {
  tenantId: string;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  createdByEmail: string | null;
  createdByName: string;
}): Promise<void> {
  await adminDb().insert(tickets).values(input);
}

export async function addTicketComment(input: {
  ticketId: string;
  tenantId: string;
  body: string;
  authorName: string;
  fromAdmin: boolean;
}): Promise<void> {
  const db = adminDb();
  await db.insert(ticketComments).values(input);
  await db
    .update(tickets)
    .set({ updatedAt: new Date() })
    .where(eq(tickets.id, input.ticketId));
}

export async function setTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<void> {
  await adminDb()
    .update(tickets)
    .set({ status, updatedAt: new Date() })
    .where(eq(tickets.id, ticketId));
}
