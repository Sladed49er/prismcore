import { desc, eq } from "drizzle-orm";
import { withTenantContext, clients, type Client } from "@prismcore/db";

export type { Client };
export type ClientType = "person" | "business";
export type ClientStatus = "prospect" | "active" | "inactive";

/** Human-readable label for a client record. Shared by Clients, Policies, etc. */
export function clientDisplayName(c: {
  type: string;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  email: string | null;
}): string {
  if (c.type === "business") return c.businessName ?? "Unnamed business";
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || c.email || "Unnamed contact";
}

/** A tenant's clients — RLS-isolated via withTenantContext. */
export async function listClients(tenantId: string): Promise<Client[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(clients)
      .where(eq(clients.tenantId, tenantId))
      .orderBy(desc(clients.createdAt)),
  );
}

export async function createClient(input: {
  tenantId: string;
  type: ClientType;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  status: ClientStatus;
  customValues: Record<string, string>;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(clients).values(input);
  });
}
