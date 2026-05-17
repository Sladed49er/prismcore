import Link from "next/link";
import { getCurrentTenant } from "@/lib/current-tenant";
import { listTickets, listTicketComments } from "@/lib/tickets";
import {
  SupportPanel,
  type TicketDTO,
  type CommentDTO,
} from "@/components/support-panel";

/**
 * The customer's own requests panel. Tickets are siloed to this tenant — a
 * customer never sees, and cannot reach, another tenant's requests.
 */
export default async function SupportRequestsPage() {
  const tenant = await getCurrentTenant();
  const [ticketRows, commentRows] = await Promise.all([
    listTickets(tenant.id),
    listTicketComments(tenant.id),
  ]);

  const tickets: TicketDTO[] = ticketRows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    status: t.status,
    priority: t.priority,
    createdByName: t.createdByName,
    createdAt: t.createdAt.toISOString(),
  }));
  const comments: CommentDTO[] = commentRows.map((c) => ({
    id: c.id,
    ticketId: c.ticketId,
    body: c.body,
    authorName: c.authorName,
    fromAdmin: c.fromAdmin,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/support"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Account
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Requests</h1>
      <p className="mt-1 text-sm text-gray-600">
        File a request or question for the Prism team. Everything here is
        private to {tenant.name} — your workspace, your tickets.
      </p>
      <SupportPanel tickets={tickets} comments={comments} />
    </div>
  );
}
