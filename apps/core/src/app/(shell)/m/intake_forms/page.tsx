import { headers } from "next/headers";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadTerms, moduleLabel } from "@/lib/terminology";
import { listForms, listSubmissions } from "@/lib/intake-forms";
import {
  IntakeFormsPanel,
  type FormDTO,
  type SubmissionDTO,
} from "@/components/intake-forms-panel";

/** Intake Forms — a public form builder with submission capture. */
export default async function IntakeFormsPage() {
  await requireModule("intake_forms");
  const { config } = await loadCurrentTenant();
  const [terms, formRows, submissionRows, hdrs] = await Promise.all([
    loadTerms(config.id),
    listForms(config.id),
    listSubmissions(config.id),
    headers(),
  ]);

  const forms: FormDTO[] = formRows.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    publicToken: f.publicToken,
    status: f.status,
    fields: f.fields,
  }));
  const submissions: SubmissionDTO[] = submissionRows.map((s) => ({
    id: s.id,
    formName: s.formName,
    values: s.values,
    status: s.status,
    leadId: s.leadId,
    createdAt: s.createdAt.toISOString(),
  }));

  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${proto}://${host}` : "";

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {moduleLabel(terms, "intake_forms", "Intake Forms")}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Build a public intake form, share its link, and work submissions —
        convert a promising one straight into a lead.
      </p>
      <IntakeFormsPanel
        forms={forms}
        submissions={submissions}
        baseUrl={baseUrl}
      />
    </div>
  );
}
