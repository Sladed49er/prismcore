import { asc, eq } from "drizzle-orm";
import { withTenantContext, producers, type Producer } from "@prismcore/db";

export type { Producer };
export type ProducerStatus = "active" | "inactive";

export async function listProducers(
  tenantId: string,
): Promise<Producer[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(producers)
      .where(eq(producers.tenantId, tenantId))
      .orderBy(asc(producers.name)),
  );
}

export async function createProducer(input: {
  tenantId: string;
  name: string;
  code: string;
  email: string;
  defaultRatePercent: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(producers).values(input);
  });
}

export async function setProducerStatus(input: {
  tenantId: string;
  id: string;
  status: ProducerStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(producers)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(producers.id, input.id));
  });
}
