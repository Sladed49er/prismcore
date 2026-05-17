import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listServiceActivities } from "@/lib/service-activities";
import { listPolicies } from "@/lib/policies";
import {
  ServiceActivitiesPanel,
  type ServiceActivityDTO,
  type PolicyOption,
} from "@/components/service-activities-panel";

export default async function ServiceActivitiesPage() {
  await requireModule("policies");
  const { config } = await loadCurrentTenant();
  const [actRows, policyRows] = await Promise.all([
    listServiceActivities(config.id),
    listPolicies(config.id),
  ]);

  const activities: ServiceActivityDTO[] = actRows.map((a) => ({
    id: a.id,
    policyNumber: a.policyNumber,
    activityType: a.activityType,
    subject: a.subject,
    detail: a.detail,
    assignedTo: a.assignedTo,
    dueDate: a.dueDate,
    status: a.status,
  }));
  const policies: PolicyOption[] = policyRows.map((p) => ({
    id: p.id,
    label: `${p.policyNumber}${p.lineOfBusiness ? ` — ${p.lineOfBusiness}` : ""}`,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/policies"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Policies
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Service Activities</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The servicing log — every inquiry, change request, and follow-up on a
        policy, tracked through to completion.
      </p>
      <ServiceActivitiesPanel activities={activities} policies={policies} />
    </div>
  );
}
