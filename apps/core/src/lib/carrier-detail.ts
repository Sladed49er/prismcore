import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  carriers,
  carrierAppointments,
  carrierContacts,
  underwritingGuidelines,
  policies,
  type Policy,
} from "@prismcore/db";

/**
 * Carrier detail loader — a carrier with its appointments, contacts,
 * underwriting guidelines, and the policies placed with it. Policies link to
 * a carrier by name (the `policies.carrier` text field), so the policy list
 * is matched on the carrier's name. RLS keeps it tenant-scoped.
 */

export interface CarrierDetail {
  carrier: typeof carriers.$inferSelect;
  appointments: (typeof carrierAppointments.$inferSelect)[];
  contacts: (typeof carrierContacts.$inferSelect)[];
  guidelines: (typeof underwritingGuidelines.$inferSelect)[];
  policies: Policy[];
}

export async function loadCarrierDetail(
  tenantId: string,
  carrierId: string,
): Promise<CarrierDetail | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [carrier] = await tx
      .select()
      .from(carriers)
      .where(eq(carriers.id, carrierId));
    if (!carrier) return null;

    const [appointments, contacts, guidelines, policyRows] = await Promise.all([
      tx
        .select()
        .from(carrierAppointments)
        .where(eq(carrierAppointments.carrierId, carrierId)),
      tx
        .select()
        .from(carrierContacts)
        .where(eq(carrierContacts.carrierId, carrierId)),
      tx
        .select()
        .from(underwritingGuidelines)
        .where(eq(underwritingGuidelines.carrierId, carrierId)),
      tx
        .select()
        .from(policies)
        .where(
          and(
            eq(policies.tenantId, tenantId),
            eq(policies.carrier, carrier.name),
          ),
        )
        .orderBy(desc(policies.createdAt)),
    ]);

    return { carrier, appointments, contacts, guidelines, policies: policyRows };
  });
}
