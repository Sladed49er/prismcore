import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  adminDb,
  intakeFormDefinitions,
  intakeFormSubmissions,
  leads,
  type IntakeFormDefinition,
  type IntakeFormField,
} from "@prismcore/db";

/**
 * Intake forms — a public form builder.
 *
 * Tenant-facing reads/writes go through `withTenantContext` (RLS). The two
 * public entry points — resolving a form by its token and recording a
 * submission — have no user session, so they go through `adminDb` and are
 * scoped by the token itself, exactly like the portal routes.
 */

export type { IntakeFormDefinition, IntakeFormField };

const FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "date",
  "select",
] as const;

/** Validate a raw field list into the stored shape. */
function cleanFields(raw: unknown): IntakeFormField[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f, i) => {
      const type = String(f.type ?? "text");
      return {
        key: String(f.key ?? `field_${i + 1}`).slice(0, 60),
        label: String(f.label ?? "").slice(0, 120),
        type: (FIELD_TYPES as readonly string[]).includes(type) ? type : "text",
        required: Boolean(f.required),
        options: Array.isArray(f.options)
          ? f.options.map((o) => String(o).slice(0, 120)).slice(0, 30)
          : [],
      };
    })
    .filter((f) => f.label);
}

// ── Tenant-facing ──────────────────────────────────────────────────

export async function listForms(
  tenantId: string,
): Promise<IntakeFormDefinition[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(intakeFormDefinitions)
      .where(eq(intakeFormDefinitions.tenantId, tenantId))
      .orderBy(desc(intakeFormDefinitions.createdAt)),
  );
}

export async function createForm(
  tenantId: string,
  name: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx.insert(intakeFormDefinitions).values({
      tenantId,
      name,
      publicToken: randomUUID().replaceAll("-", ""),
      fields: [
        { key: "name", label: "Your name", type: "text", required: true, options: [] },
        { key: "email", label: "Email", type: "email", required: true, options: [] },
        { key: "phone", label: "Phone", type: "phone", required: false, options: [] },
      ],
    });
  });
}

export async function updateForm(input: {
  tenantId: string;
  id: string;
  name: string;
  description: string;
  status: string;
  fields: IntakeFormField[];
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(intakeFormDefinitions)
      .set({
        name: input.name,
        description: input.description,
        status: input.status === "published" ? "published" : "draft",
        fields: cleanFields(input.fields),
        updatedAt: new Date(),
      })
      .where(eq(intakeFormDefinitions.id, input.id));
  });
}

export async function deleteForm(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(intakeFormDefinitions)
      .where(eq(intakeFormDefinitions.id, id));
  });
}

export interface SubmissionRow {
  id: string;
  formId: string;
  formName: string;
  values: Record<string, string>;
  status: string;
  leadId: string | null;
  createdAt: Date;
}

export async function listSubmissions(
  tenantId: string,
): Promise<SubmissionRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: intakeFormSubmissions.id,
        formId: intakeFormSubmissions.formId,
        formName: intakeFormDefinitions.name,
        values: intakeFormSubmissions.values,
        status: intakeFormSubmissions.status,
        leadId: intakeFormSubmissions.leadId,
        createdAt: intakeFormSubmissions.createdAt,
      })
      .from(intakeFormSubmissions)
      .innerJoin(
        intakeFormDefinitions,
        eq(intakeFormDefinitions.id, intakeFormSubmissions.formId),
      )
      .where(eq(intakeFormSubmissions.tenantId, tenantId))
      .orderBy(desc(intakeFormSubmissions.createdAt));
    return rows;
  });
}

/** Pick the value most likely to be a given contact field. */
function pick(
  values: Record<string, string>,
  fields: IntakeFormField[],
  want: "name" | "email" | "phone" | "company",
): string {
  // A field whose type matches outright.
  if (want === "email" || want === "phone") {
    const typed = fields.find((f) => f.type === want);
    if (typed && values[typed.key]) return values[typed.key]!;
  }
  // Otherwise a field whose key or label mentions the word.
  const match = fields.find(
    (f) =>
      f.key.toLowerCase().includes(want) ||
      f.label.toLowerCase().includes(want),
  );
  return match ? (values[match.key] ?? "") : "";
}

/** Convert a submission into a lead and stamp the submission converted. */
export async function convertSubmissionToLead(
  tenantId: string,
  submissionId: string,
): Promise<{ ok: boolean; message: string }> {
  return withTenantContext(tenantId, async (tx) => {
    const [sub] = await tx
      .select()
      .from(intakeFormSubmissions)
      .where(eq(intakeFormSubmissions.id, submissionId));
    if (!sub) return { ok: false, message: "Submission not found." };
    if (sub.leadId) return { ok: false, message: "Already converted." };

    const [form] = await tx
      .select()
      .from(intakeFormDefinitions)
      .where(eq(intakeFormDefinitions.id, sub.formId));
    const fields = form?.fields ?? [];
    const email = pick(sub.values, fields, "email");
    const name =
      pick(sub.values, fields, "name") || email || "Form submission";
    const notes = Object.entries(sub.values)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const [lead] = await tx
      .insert(leads)
      .values({
        tenantId,
        name,
        company: pick(sub.values, fields, "company"),
        email,
        phone: pick(sub.values, fields, "phone"),
        source: form ? `Intake form — ${form.name}` : "Intake form",
        lineOfBusiness: "",
        estimatedValueCents: 0,
        notes,
      })
      .returning({ id: leads.id });

    await tx
      .update(intakeFormSubmissions)
      .set({ status: "converted", leadId: lead!.id })
      .where(eq(intakeFormSubmissions.id, submissionId));
    return { ok: true, message: `Lead created for ${name}.` };
  });
}

export async function archiveSubmission(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(intakeFormSubmissions)
      .set({ status: "archived" })
      .where(eq(intakeFormSubmissions.id, id));
  });
}

// ── Public (token-scoped, no session) ──────────────────────────────

/** Resolve a published form by its public token. Null when not live. */
export async function getPublishedForm(
  token: string,
): Promise<IntakeFormDefinition | null> {
  const [form] = await adminDb()
    .select()
    .from(intakeFormDefinitions)
    .where(eq(intakeFormDefinitions.publicToken, token));
  if (!form || form.status !== "published") return null;
  return form;
}

/** Record a public submission against a form's token. */
export async function recordSubmission(
  token: string,
  values: Record<string, string>,
): Promise<{ ok: boolean; message: string }> {
  const form = await getPublishedForm(token);
  if (!form) {
    return { ok: false, message: "This form is not available." };
  }
  // Keep only declared fields, and enforce required ones.
  const clean: Record<string, string> = {};
  for (const f of form.fields) {
    const v = (values[f.key] ?? "").toString().slice(0, 2000).trim();
    if (f.required && !v) {
      return { ok: false, message: `"${f.label}" is required.` };
    }
    if (v) clean[f.key] = v;
  }
  await adminDb()
    .insert(intakeFormSubmissions)
    .values({ tenantId: form.tenantId, formId: form.id, values: clean });
  return { ok: true, message: "Thanks — your submission was received." };
}
