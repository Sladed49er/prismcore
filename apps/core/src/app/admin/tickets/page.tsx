import Link from "next/link";
import { adminDb, tenants } from "@prismcore/db";
import { requireAdmin } from "@/lib/auth";
import { listAllTickets, listAllTicketComments } from "@/lib/tickets";
import {
  AdminTicketQueue,
  type AdminTicketDTO,
  type CommentDTO,
} from "@/components/admin-ticket-queue";

/**
 * Platform-admin ticket queue — every tenant's tickets in one place. Guarded by
 * `requireAdmin`; the customer-facing `/support` page only ever shows one tenant.
 */
export default async function AdminTicketsPage() {
  await requireAdmin();

  const [ticketRows, commentRows, tenantRows] = await Promise.all([
    listAllTickets(),
    listAllTicketComments(),
    adminDb().select().from(tenants),
  ]);
  const tenantName = new Map(tenantRows.map((t) => [t.id, t.name]));

  const tickets: AdminTicketDTO[] = ticketRows.map((t) => ({
    id: t.id,
    tenantId: t.tenantId,
    tenantName: tenantName.get(t.tenantId) ?? "—",
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

  const openCount = tickets.filter(
    (t) => t.status === "open" || t.status === "in_progress",
  ).length;

  return (
    <main className="mx-auto max-w-4xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-500">
            Platform Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Ticket queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            {openCount} open across {tenantName.size} tenants.
          </p>
        </div>
        <Link
          href="/admin"
          className="shrink-0 text-sm text-gray-400 transition hover:text-gray-600"
        >
          ← Tenants
        </Link>
      </div>
      <AdminTicketQueue tickets={tickets} comments={comments} />
    </main>
  );
}
