"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  addTicketComment,
  setTicketStatus,
  type TicketStatus,
} from "@/lib/tickets";

/** Platform admin moves a ticket through its lifecycle. */
export async function changeStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<void> {
  await requireAdmin();
  await setTicketStatus(ticketId, status);
  revalidatePath("/admin/tickets");
}

/** Platform admin replies on a ticket (marked as the Prism team). */
export async function adminComment(
  ticketId: string,
  tenantId: string,
  body: string,
): Promise<void> {
  const viewer = await requireAdmin();
  const text = body.trim();
  if (!text) return;
  await addTicketComment({
    ticketId,
    tenantId,
    body: text,
    authorName: viewer.name,
    fromAdmin: true,
  });
  revalidatePath("/admin/tickets");
}
