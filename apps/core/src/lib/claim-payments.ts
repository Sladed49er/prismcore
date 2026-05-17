import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  claimPayments,
  claims,
  type ClaimPayment,
} from "@prismcore/db";

export type { ClaimPayment };
export type ClaimPaymentType =
  | "indemnity"
  | "expense"
  | "legal"
  | "medical";
export type ClaimPaymentStatus =
  | "pending"
  | "issued"
  | "cleared"
  | "voided";

export interface ClaimPaymentRow extends ClaimPayment {
  claimNumber: string;
}

export async function listClaimPayments(
  tenantId: string,
): Promise<ClaimPaymentRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ payment: claimPayments, claim: claims })
      .from(claimPayments)
      .leftJoin(claims, eq(claimPayments.claimId, claims.id))
      .where(eq(claimPayments.tenantId, tenantId))
      .orderBy(desc(claimPayments.createdAt));
    return rows.map((r) => ({
      ...r.payment,
      claimNumber: r.claim?.claimNumber ?? "—",
    }));
  });
}

export async function createClaimPayment(input: {
  tenantId: string;
  claimId: string;
  paymentDate: string | null;
  payee: string;
  paymentType: ClaimPaymentType;
  amountCents: number;
  checkNumber: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(claimPayments).values(input);
  });
}

export async function setClaimPaymentStatus(input: {
  tenantId: string;
  id: string;
  status: ClaimPaymentStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(claimPayments)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(claimPayments.id, input.id));
  });
}
