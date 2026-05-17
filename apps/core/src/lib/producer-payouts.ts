import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  producerPayouts,
  producers,
  type ProducerPayout,
} from "@prismcore/db";

export type { ProducerPayout };

export interface ProducerPayoutRow extends ProducerPayout {
  producerName: string;
}

export async function listProducerPayouts(
  tenantId: string,
): Promise<ProducerPayoutRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ payout: producerPayouts, producer: producers })
      .from(producerPayouts)
      .leftJoin(producers, eq(producerPayouts.producerId, producers.id))
      .where(eq(producerPayouts.tenantId, tenantId))
      .orderBy(desc(producerPayouts.payoutDate));
    return rows.map((r) => ({
      ...r.payout,
      producerName: r.producer?.name ?? "—",
    }));
  });
}

export async function createProducerPayout(input: {
  tenantId: string;
  producerId: string;
  payoutDate: string | null;
  periodLabel: string;
  amountCents: number;
  method: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(producerPayouts).values(input);
  });
}

export async function markPayoutPaid(input: {
  tenantId: string;
  id: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(producerPayouts)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(producerPayouts.id, input.id));
  });
}
