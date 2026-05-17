import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  clientActivities,
  clients,
  type ClientActivity,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { ClientActivity };
export type ClientActivityType =
  | "call"
  | "email"
  | "meeting"
  | "note"
  | "task";

export interface ClientActivityRow extends ClientActivity {
  clientName: string;
}

export async function listClientActivities(
  tenantId: string,
): Promise<ClientActivityRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ activity: clientActivities, client: clients })
      .from(clientActivities)
      .leftJoin(clients, eq(clientActivities.clientId, clients.id))
      .where(eq(clientActivities.tenantId, tenantId))
      .orderBy(desc(clientActivities.createdAt));
    return rows.map((r) => ({
      ...r.activity,
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createClientActivity(input: {
  tenantId: string;
  clientId: string;
  activityType: ClientActivityType;
  subject: string;
  detail: string;
  activityDate: string | null;
  author: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(clientActivities).values(input);
  });
}

export async function updateClientActivity(input: {
  tenantId: string;
  id: string;
  clientId: string;
  activityType: ClientActivityType;
  subject: string;
  detail: string;
  activityDate: string | null;
  author: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(clientActivities)
      .set({
        clientId: input.clientId,
        activityType: input.activityType,
        subject: input.subject,
        detail: input.detail,
        activityDate: input.activityDate,
        author: input.author,
        updatedAt: new Date(),
      })
      .where(eq(clientActivities.id, input.id));
  });
}

export async function deleteClientActivity(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(clientActivities).where(eq(clientActivities.id, id));
  });
}
