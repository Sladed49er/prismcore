import { desc, eq } from "drizzle-orm";
import {
  adminDb,
  withTenantContext,
  tickets,
  ticketComments,
  type Ticket,
  type TicketComment,
} from "@prismcore/db";

export type { Ticket, TicketComment };
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high";

/* Tenant-facing reads/writes run through `withTenantContext` (RLS-bound). The
 * cross-tenant `listAll*` / `setTicketStatus` are platform-admin only and run as
 * the owner — `requireAdmin` gates every caller of them. */

/** A single tenant's tickets — RLS guarantees the silo. */
export async function listTickets(tenantId: string): Promise<Ticket[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(tickets)
      .where(eq(tickets.tenantId, tenantId))
      .orderBy(desc(tickets.createdAt)),
  );
}

export async function listTicketComments(
  tenantId: string,
): Promise<TicketComment[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(ticketComments)
      .where(eq(ticketComments.tenantId, tenantId))
      .orderBy(ticketComments.createdAt),
  );
}

/** Every tenant's tickets — platform-admin view only (owner role). */
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
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(tickets).values(input);
  });
}

/**
 * Add a comment. Runs in the ticket's tenant context — works for both the
 * customer (their own tenant) and a platform admin replying (the admin passes
 * the ticket's tenant id, so the GUC is set to that tenant).
 */
export async function addTicketComment(input: {
  ticketId: string;
  tenantId: string;
  body: string;
  authorName: string;
  fromAdmin: boolean;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(ticketComments).values(input);
    await tx
      .update(tickets)
      .set({ updatedAt: new Date() })
      .where(eq(tickets.id, input.ticketId));
  });
}

/** Move a ticket through its lifecycle — platform-admin only (owner role). */
export async function setTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<void> {
  await adminDb()
    .update(tickets)
    .set({ status, updatedAt: new Date() })
    .where(eq(tickets.id, ticketId));
}
