import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listScheduleItems } from "@/lib/schedules";
import { listPolicies } from "@/lib/policies";
import {
  SchedulesPanel,
  type ScheduleItemDTO,
  type PolicyOption,
} from "@/components/schedules-panel";

export default async function SchedulesPage() {
  await requireModule("policies");
  const { config } = await loadCurrentTenant();
  const [itemRows, policyRows] = await Promise.all([
    listScheduleItems(config.id),
    listPolicies(config.id),
  ]);

  const items: ScheduleItemDTO[] = itemRows.map((i) => ({
    id: i.id,
    policyNumber: i.policyNumber,
    itemType: i.itemType,
    description: i.description,
    identifier: i.identifier,
    valueCents: i.valueCents,
    notes: i.notes,
  }));
  const policies: PolicyOption[] = policyRows.map((p) => ({
    id: p.id,
    label: `${p.policyNumber}${p.lineOfBusiness ? ` — ${p.lineOfBusiness}` : ""}`,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/policies"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Policies
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Insured Schedules</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The items scheduled on each policy — vehicles, drivers, locations, and
        equipment, with their insured values.
      </p>
      <SchedulesPanel items={items} policies={policies} />
    </div>
  );
}
