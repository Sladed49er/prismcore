"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { getViewer } from "@/lib/auth";
import { createTicket, addTicketComment, type TicketPriority } from "@/lib/tickets";

/** Customer files a request — scoped to their own tenant. */
export async function submitTicket(input: {
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
}): Promise<void> {
  const title = input.title.trim();
  if (!title) return;
  const [tenant, viewer] = await Promise.all([getCurrentTenant(), getViewer()]);
  await createTicket({
    tenantId: tenant.id,
    title,
    description: input.description.trim(),
    category: input.category,
    priority: input.priority,
    createdByEmail: viewer?.email ?? null,
    createdByName: viewer?.name ?? "User",
  });
  revalidatePath("/support");
}

export async function commentOnTicket(
  ticketId: string,
  body: string,
): Promise<void> {
  const text = body.trim();
  if (!text) return;
  const [tenant, viewer] = await Promise.all([getCurrentTenant(), getViewer()]);
  await addTicketComment({
    ticketId,
    tenantId: tenant.id,
    body: text,
    authorName: viewer?.name ?? "User",
    fromAdmin: false,
  });
  revalidatePath("/support");
}
