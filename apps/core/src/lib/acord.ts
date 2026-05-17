import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  acordForms,
  clients,
  type AcordForm,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

export type { AcordForm };
export type AcordStatus = "draft" | "completed" | "submitted";

export interface AcordFormRow extends AcordForm {
  clientName: string;
}

export async function listAcordForms(
  tenantId: string,
): Promise<AcordFormRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ form: acordForms, client: clients })
      .from(acordForms)
      .leftJoin(clients, eq(acordForms.clientId, clients.id))
      .where(eq(acordForms.tenantId, tenantId))
      .orderBy(desc(acordForms.createdAt));
    return rows.map((r) => ({
      ...r.form,
      clientName: r.client ? clientDisplayName(r.client) : "—",
    }));
  });
}

export async function createAcordForm(input: {
  tenantId: string;
  clientId: string;
  formType: string;
  status: AcordStatus;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(acordForms).values(input);
  });
}

export async function setAcordStatus(
  tenantId: string,
  formId: string,
  status: AcordStatus,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(acordForms)
      .set({ status, updatedAt: new Date() })
      .where(eq(acordForms.id, formId));
  });
}
