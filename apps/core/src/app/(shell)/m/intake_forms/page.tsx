import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listIntake } from "@/lib/intake";
import { IntakePanel, type IntakeDTO } from "@/components/intake-panel";

export default async function IntakeFormsPage() {
  await requireModule("intake_forms");
  const { config } = await loadCurrentTenant();
  const rows = await listIntake(config.id);

  const submissions: IntakeDTO[] = rows.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    interest: s.interest,
    status: s.status,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Intake Forms</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Prospects captured through public intake forms — worked from new lead to
        converted.
      </p>
      <IntakePanel submissions={submissions} />
    </div>
  );
}
