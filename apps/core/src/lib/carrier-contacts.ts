import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  carrierContacts,
  carriers,
  type CarrierContact,
} from "@prismcore/db";

export type { CarrierContact };
export type CarrierContactRole =
  | "underwriter"
  | "marketing"
  | "claims"
  | "billing"
  | "other";

export interface CarrierContactRow extends CarrierContact {
  carrierName: string;
}

export async function listCarrierContacts(
  tenantId: string,
): Promise<CarrierContactRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ contact: carrierContacts, carrier: carriers })
      .from(carrierContacts)
      .leftJoin(carriers, eq(carrierContacts.carrierId, carriers.id))
      .where(eq(carrierContacts.tenantId, tenantId))
      .orderBy(desc(carrierContacts.createdAt));
    return rows.map((r) => ({
      ...r.contact,
      carrierName: r.carrier?.name ?? "—",
    }));
  });
}

export async function createCarrierContact(input: {
  tenantId: string;
  carrierId: string;
  name: string;
  title: string;
  role: CarrierContactRole;
  email: string;
  phone: string;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(carrierContacts).values(input);
  });
}
