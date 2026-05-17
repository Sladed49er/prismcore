import { desc, eq } from "drizzle-orm";
import { withTenantContext, carriers, type Carrier } from "@prismcore/db";

export type { Carrier };
export type CarrierStatus = "active" | "prospective" | "inactive";

/** The tenant's appointed carriers. RLS-isolated. */
export async function listCarriers(tenantId: string): Promise<Carrier[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(carriers)
      .where(eq(carriers.tenantId, tenantId))
      .orderBy(desc(carriers.createdAt)),
  );
}

export async function createCarrier(input: {
  tenantId: string;
  name: string;
  naicCode: string;
  appetite: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: CarrierStatus;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(carriers).values(input);
  });
}
