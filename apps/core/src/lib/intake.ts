import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  intakeSubmissions,
  type IntakeSubmission,
} from "@prismcore/db";

export type { IntakeSubmission };
export type IntakeStatus = "new" | "contacted" | "converted";

export async function listIntake(
  tenantId: string,
): Promise<IntakeSubmission[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(intakeSubmissions)
      .where(eq(intakeSubmissions.tenantId, tenantId))
      .orderBy(desc(intakeSubmissions.createdAt)),
  );
}

export async function createIntake(input: {
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  status: IntakeStatus;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(intakeSubmissions).values(input);
  });
}

export async function setIntakeStatus(
  tenantId: string,
  submissionId: string,
  status: IntakeStatus,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(intakeSubmissions)
      .set({ status })
      .where(eq(intakeSubmissions.id, submissionId));
  });
}
