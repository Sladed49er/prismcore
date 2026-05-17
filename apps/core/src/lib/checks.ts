import { desc, eq } from "drizzle-orm";
import { withTenantContext, checkRegister, type Check } from "@prismcore/db";

export type { Check };
export type CheckStatus = "printed" | "cleared" | "voided";

export async function listChecks(tenantId: string): Promise<Check[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(checkRegister)
      .where(eq(checkRegister.tenantId, tenantId))
      .orderBy(desc(checkRegister.createdAt)),
  );
}

export async function createCheck(input: {
  tenantId: string;
  checkNumber: string;
  payee: string;
  amountCents: number;
  checkDate: string | null;
  memo: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(checkRegister).values(input);
  });
}

export async function updateCheck(input: {
  tenantId: string;
  id: string;
  checkNumber: string;
  payee: string;
  amountCents: number;
  checkDate: string | null;
  memo: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(checkRegister)
      .set({
        checkNumber: input.checkNumber,
        payee: input.payee,
        amountCents: input.amountCents,
        checkDate: input.checkDate,
        memo: input.memo,
        updatedAt: new Date(),
      })
      .where(eq(checkRegister.id, input.id));
  });
}

export async function deleteCheck(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(checkRegister).where(eq(checkRegister.id, id));
  });
}

export async function setCheckStatus(input: {
  tenantId: string;
  id: string;
  status: CheckStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(checkRegister)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(checkRegister.id, input.id));
  });
}
