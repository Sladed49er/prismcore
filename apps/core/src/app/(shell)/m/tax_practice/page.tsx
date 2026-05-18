import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listTaxEngagements, listTaxTimesheets } from "@/lib/tax-practice";
import {
  TaxPracticePanel,
  type TaxEngagementDTO,
} from "@/components/tax-practice-panel";
import {
  TaxTimesheetsPanel,
  type TaxTimesheetDTO,
  type EngagementOption,
} from "@/components/tax-timesheets-panel";

const TYPE_LABEL: Record<TaxEngagementDTO["engagementType"], string> = {
  form_1040: "1040",
  form_1120: "1120",
  form_1120s: "1120-S",
  form_1065: "1065",
  form_990: "990",
  other: "Other",
};

/**
 * Tax Practice module — tax-preparation engagements and the time logged
 * against each.
 */
export default async function TaxPracticePage() {
  await requireModule("tax_practice");
  const { config } = await loadCurrentTenant();
  const [engagementRows, timesheetRows] = await Promise.all([
    listTaxEngagements(config.id),
    listTaxTimesheets(config.id),
  ]);

  const engagements: TaxEngagementDTO[] = engagementRows.map((e) => ({
    id: e.id,
    clientName: e.clientName,
    taxYear: e.taxYear,
    engagementType: e.engagementType,
    status: e.status,
    dueDate: e.dueDate,
    feeCents: e.feeCents,
    preparerName: e.preparerName,
    notes: e.notes,
  }));

  const timesheets: TaxTimesheetDTO[] = timesheetRows.map((t) => ({
    id: t.id,
    engagementId: t.engagementId,
    engagementLabel: t.engagementLabel,
    workDate: t.workDate,
    minutes: t.minutes,
    description: t.description,
    preparerName: t.preparerName,
    billable: t.billable,
  }));

  const engagementOptions: EngagementOption[] = engagementRows.map((e) => ({
    id: e.id,
    label: `${e.clientName} — ${TYPE_LABEL[e.engagementType]} (TY ${e.taxYear})`,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Wealth
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Tax Practice</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Tax-preparation engagements — each return tracked from not-started
        through filed — and the time logged against them.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Engagements</h2>
      <TaxPracticePanel engagements={engagements} />

      <h2 className="mt-10 text-lg font-semibold">Timesheets</h2>
      <p className="mt-1 text-sm text-gray-500">
        Time logged against each engagement, billable and non-billable.
      </p>
      <TaxTimesheetsPanel
        entries={timesheets}
        engagements={engagementOptions}
      />
    </div>
  );
}
