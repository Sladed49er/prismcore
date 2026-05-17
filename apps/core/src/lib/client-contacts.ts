import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  clientContacts,
  clients,
  type ClientContact,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { ClientContact };
export type ClientContactRole =
  | "primary"
  | "billing"
  | "claims"
  | "decision_maker"
  | "other";

export interface ClientContactRow extends ClientContact {
  clientName: string;
}

export async function listClientContacts(
  tenantId: string,
): Promise<ClientContactRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ contact: clientContacts, client: clients })
      .from(clientContacts)
      .leftJoin(clients, eq(clientContacts.clientId, clients.id))
      .where(eq(clientContacts.tenantId, tenantId))
      .orderBy(desc(clientContacts.createdAt));
    return rows.map((r) => ({
      ...r.contact,
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createClientContact(input: {
  tenantId: string;
  clientId: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  role: ClientContactRole;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(clientContacts).values(input);
  });
}

export async function updateClientContact(input: {
  tenantId: string;
  id: string;
  clientId: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  role: ClientContactRole;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(clientContacts)
      .set({
        clientId: input.clientId,
        name: input.name,
        title: input.title,
        email: input.email,
        phone: input.phone,
        role: input.role,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(clientContacts.id, input.id));
  });
}

export async function deleteClientContact(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(clientContacts).where(eq(clientContacts.id, id));
  });
}
