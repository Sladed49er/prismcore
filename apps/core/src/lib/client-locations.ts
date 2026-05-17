import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  clientLocations,
  clients,
  type ClientLocation,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { ClientLocation };
export type ClientLocationType =
  | "mailing"
  | "physical"
  | "billing"
  | "branch";

export interface ClientLocationRow extends ClientLocation {
  clientName: string;
}

export async function listClientLocations(
  tenantId: string,
): Promise<ClientLocationRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ location: clientLocations, client: clients })
      .from(clientLocations)
      .leftJoin(clients, eq(clientLocations.clientId, clients.id))
      .where(eq(clientLocations.tenantId, tenantId))
      .orderBy(desc(clientLocations.createdAt));
    return rows.map((r) => ({
      ...r.location,
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createClientLocation(input: {
  tenantId: string;
  clientId: string;
  label: string;
  locationType: ClientLocationType;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(clientLocations).values(input);
  });
}

export async function updateClientLocation(input: {
  tenantId: string;
  id: string;
  clientId: string;
  label: string;
  locationType: ClientLocationType;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(clientLocations)
      .set({
        clientId: input.clientId,
        label: input.label,
        locationType: input.locationType,
        addressLine: input.addressLine,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        updatedAt: new Date(),
      })
      .where(eq(clientLocations.id, input.id));
  });
}

export async function deleteClientLocation(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(clientLocations).where(eq(clientLocations.id, id));
  });
}
