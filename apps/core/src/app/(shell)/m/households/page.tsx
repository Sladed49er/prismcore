import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listHouseholds, listHouseholdMembers } from "@/lib/households";
import {
  HouseholdsPanel,
  type HouseholdDTO,
} from "@/components/households-panel";
import {
  HouseholdMembersPanel,
  type HouseholdMemberDTO,
  type HouseholdOption,
} from "@/components/household-members-panel";

/**
 * Households module — the wealth-management household: the family or entity
 * unit a financial practice advises, plus the individual members within it.
 */
export default async function HouseholdsPage() {
  await requireModule("households");
  const { config } = await loadCurrentTenant();
  const [householdRows, memberRows] = await Promise.all([
    listHouseholds(config.id),
    listHouseholdMembers(config.id),
  ]);

  const households: HouseholdDTO[] = householdRows.map((h) => ({
    id: h.id,
    name: h.name,
    primaryContactName: h.primaryContactName,
    advisorName: h.advisorName,
    type: h.type,
    aumCents: h.aumCents,
    riskProfile: h.riskProfile,
    status: h.status,
    notes: h.notes,
  }));

  const members: HouseholdMemberDTO[] = memberRows.map((m) => ({
    id: m.id,
    householdId: m.householdId,
    householdName: m.householdName,
    name: m.name,
    relationship: m.relationship,
    email: m.email,
    phone: m.phone,
    dateOfBirth: m.dateOfBirth,
    isPrimary: m.isPrimary,
    notes: m.notes,
  }));

  const householdOptions: HouseholdOption[] = householdRows.map((h) => ({
    id: h.id,
    name: h.name,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Wealth
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Households</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The household is the unit of wealth management — a family, individual,
        trust, or business, with its advisor, assets, and risk profile.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Households</h2>
      <HouseholdsPanel households={households} />

      <h2 className="mt-10 text-lg font-semibold">Members</h2>
      <p className="mt-1 text-sm text-gray-500">
        The individual people who make up each household.
      </p>
      <HouseholdMembersPanel members={members} households={householdOptions} />
    </div>
  );
}
