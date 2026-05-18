import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  acordForms,
  clients,
  clientLocations,
  policies,
  policyCoverages,
  carriers,
  type AcordForm,
} from "@prismcore/db";
import { clientDisplayName } from "@/lib/clients";

/**
 * ACORD forms — preparation and prefill.
 *
 * Each supported ACORD form declares its field list; `prefillFields` reads a
 * client (and an optional policy) and populates every field it can from live
 * data. The prepared form is stored with its field map, editable, and marked
 * completed when ready. RLS-scoped through `withTenantContext`.
 */

export type { AcordForm };
export type AcordStatus = "draft" | "completed" | "submitted";

// ── Form catalog ────────────────────────────────────────────────────

/** Human label for every field key used across the forms. */
const FIELD_LABELS: Record<string, string> = {
  named_insured: "Named insured",
  dba: "DBA / trade name",
  mailing_address: "Mailing address",
  city: "City",
  state: "State",
  zip: "ZIP",
  email: "Email",
  phone: "Phone",
  business_type: "Business / entity type",
  line_of_business: "Line of business",
  effective_date: "Effective date",
  expiration_date: "Expiration date",
  carrier: "Carrier",
  naic_code: "Carrier NAIC code",
  policy_number: "Policy number",
  annual_premium: "Annual premium",
  coverage_summary: "Coverage summary",
  description_of_operations: "Description of operations",
  prepared_date: "Date prepared",
  certificate_holder: "Certificate holder",
  location_address: "Location address",
  each_occurrence_limit: "Each-occurrence limit",
  general_aggregate_limit: "General aggregate limit",
  products_aggregate_limit: "Products/completed-ops aggregate",
  personal_injury_limit: "Personal & advertising injury limit",
  classification: "Classification",
  building_limit: "Building limit",
  contents_limit: "Business personal property limit",
  deductible: "Deductible",
  construction_type: "Construction type",
  occupancy: "Occupancy",
  dwelling_limit: "Dwelling (Coverage A) limit",
  personal_property_limit: "Personal property (Coverage C) limit",
  liability_limit: "Personal liability limit",
  year_built: "Year built",
  bodily_injury_limit: "Bodily injury limit",
  property_damage_limit: "Property damage limit",
  comprehensive_deductible: "Comprehensive deductible",
  collision_deductible: "Collision deductible",
  drivers: "Drivers",
  vehicles: "Vehicles",
};

export interface AcordFormDef {
  type: string;
  name: string;
  description: string;
  fieldKeys: string[];
}

export const ACORD_FORMS: AcordFormDef[] = [
  {
    type: "ACORD 125",
    name: "Commercial Insurance Application",
    description: "Applicant and general information for a commercial account.",
    fieldKeys: [
      "named_insured", "dba", "mailing_address", "city", "state", "zip",
      "email", "phone", "business_type", "line_of_business",
      "effective_date", "expiration_date", "carrier", "policy_number",
      "annual_premium", "description_of_operations", "prepared_date",
    ],
  },
  {
    type: "ACORD 126",
    name: "Commercial General Liability Section",
    description: "CGL coverage limits and classifications.",
    fieldKeys: [
      "named_insured", "policy_number", "carrier", "effective_date",
      "expiration_date", "each_occurrence_limit", "general_aggregate_limit",
      "products_aggregate_limit", "personal_injury_limit", "classification",
      "coverage_summary", "prepared_date",
    ],
  },
  {
    type: "ACORD 140",
    name: "Property Section",
    description: "Commercial property — building and contents.",
    fieldKeys: [
      "named_insured", "policy_number", "carrier", "effective_date",
      "expiration_date", "location_address", "building_limit",
      "contents_limit", "deductible", "construction_type", "occupancy",
      "prepared_date",
    ],
  },
  {
    type: "ACORD 25",
    name: "Certificate of Liability Insurance",
    description: "Evidence of coverage for a certificate holder.",
    fieldKeys: [
      "certificate_holder", "named_insured", "mailing_address", "city",
      "state", "zip", "carrier", "naic_code", "policy_number",
      "effective_date", "expiration_date", "each_occurrence_limit",
      "general_aggregate_limit", "description_of_operations", "prepared_date",
    ],
  },
  {
    type: "ACORD 80",
    name: "Homeowner Application",
    description: "Personal lines homeowner application.",
    fieldKeys: [
      "named_insured", "mailing_address", "city", "state", "zip", "email",
      "phone", "effective_date", "expiration_date", "carrier",
      "policy_number", "dwelling_limit", "personal_property_limit",
      "liability_limit", "deductible", "year_built", "prepared_date",
    ],
  },
  {
    type: "ACORD 90",
    name: "Personal Auto Application",
    description: "Personal lines automobile application.",
    fieldKeys: [
      "named_insured", "mailing_address", "city", "state", "zip", "email",
      "phone", "effective_date", "expiration_date", "carrier",
      "policy_number", "bodily_injury_limit", "property_damage_limit",
      "comprehensive_deductible", "collision_deductible", "drivers",
      "vehicles", "prepared_date",
    ],
  },
];

/** The field key/label pairs for a form type, in order. */
export function formFields(
  formType: string,
): { key: string; label: string }[] {
  const def = ACORD_FORMS.find((f) => f.type === formType);
  if (!def) return [];
  return def.fieldKeys.map((key) => ({
    key,
    label: FIELD_LABELS[key] ?? key,
  }));
}

// ── Prefill ─────────────────────────────────────────────────────────

/**
 * Build the field map for an ACORD form, prefilled from live data — the
 * client, an optional policy, the policy's carrier, and its coverages.
 * Fields with no live source are returned blank for the preparer to fill.
 */
export async function prefillFields(
  tenantId: string,
  formType: string,
  clientId: string,
  policyId: string | null,
): Promise<Record<string, string>> {
  const def = ACORD_FORMS.find((f) => f.type === formType);
  if (!def) return {};

  return withTenantContext(tenantId, async (tx) => {
    const [client] = await tx
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));
    if (!client) return {};
    const [location] = await tx
      .select()
      .from(clientLocations)
      .where(eq(clientLocations.clientId, clientId));

    let policy: typeof policies.$inferSelect | undefined;
    let coverageSummary = "";
    let naic = "";
    if (policyId) {
      [policy] = await tx
        .select()
        .from(policies)
        .where(eq(policies.id, policyId));
      if (policy) {
        const covs = await tx
          .select()
          .from(policyCoverages)
          .where(eq(policyCoverages.policyId, policy.id));
        coverageSummary = covs
          .map((c) => `${c.coverageType}: ${c.limitText || "—"}`)
          .join("; ");
        const [carrierRow] = await tx
          .select()
          .from(carriers)
          .where(eq(carriers.name, policy.carrier));
        naic = carrierRow?.naicCode ?? "";
      }
    }

    const known: Record<string, string> = {
      named_insured: clientDisplayName(client),
      dba: client.type === "business" ? (client.businessName ?? "") : "",
      mailing_address: location?.addressLine ?? "",
      location_address: location?.addressLine ?? "",
      city: location?.city || client.city || "",
      state: location?.state || client.state || "",
      zip: location?.postalCode ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      business_type: client.type === "business" ? "Business" : "Individual",
      line_of_business: policy?.lineOfBusiness ?? "",
      effective_date: policy?.effectiveDate ?? "",
      expiration_date: policy?.expirationDate ?? "",
      carrier: policy?.carrier ?? "",
      naic_code: naic,
      policy_number: policy?.policyNumber ?? "",
      annual_premium: policy
        ? `$${(policy.premiumCents / 100).toLocaleString()}`
        : "",
      coverage_summary: coverageSummary,
      prepared_date: new Date().toISOString().slice(0, 10),
    };

    const values: Record<string, string> = {};
    for (const key of def.fieldKeys) values[key] = known[key] ?? "";
    return values;
  });
}

// ── Data layer ──────────────────────────────────────────────────────

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

export async function getAcordForm(
  tenantId: string,
  id: string,
): Promise<AcordForm | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(acordForms)
      .where(eq(acordForms.id, id));
    return row ?? null;
  });
}

/** Prepare an ACORD form — prefills its fields from live data. */
export async function prepareAcordForm(input: {
  tenantId: string;
  clientId: string;
  policyId: string | null;
  formType: string;
  notes: string;
}): Promise<void> {
  const fieldValues = await prefillFields(
    input.tenantId,
    input.formType,
    input.clientId,
    input.policyId,
  );
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(acordForms).values({
      tenantId: input.tenantId,
      clientId: input.clientId,
      policyId: input.policyId,
      formType: input.formType,
      status: "draft",
      fieldValues,
      notes: input.notes,
    });
  });
}

/** Save edits to a prepared form's field map / status / notes. */
export async function updateAcordForm(input: {
  tenantId: string;
  id: string;
  status: AcordStatus;
  fieldValues: Record<string, string>;
  notes: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(acordForms)
      .set({
        status: input.status,
        fieldValues: input.fieldValues,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(acordForms.id, input.id));
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

export async function deleteAcordForm(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.delete(acordForms).where(eq(acordForms.id, id));
  });
}
