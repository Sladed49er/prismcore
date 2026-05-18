import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listMemberBenefits } from "@/lib/member-benefits";
import {
  MemberBenefitsPanel,
  type MemberBenefitDTO,
} from "@/components/member-benefits-panel";

/**
 * Member Benefits module — the catalog of partner perks, discounts, and
 * resources an association offers its members.
 */
export default async function MemberBenefitsPage() {
  await requireModule("member_benefits");
  const { config } = await loadCurrentTenant();
  const rows = await listMemberBenefits(config.id);

  const benefits: MemberBenefitDTO[] = rows.map((b) => ({
    id: b.id,
    name: b.name,
    partnerName: b.partnerName,
    category: b.category,
    description: b.description,
    redemptionDetails: b.redemptionDetails,
    url: b.url,
    isActive: b.isActive,
    notes: b.notes,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Association
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Member Benefits</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The perks of membership — partner discounts, services, and resources —
        the catalog members see in the member portal.
      </p>
      <MemberBenefitsPanel benefits={benefits} />
    </div>
  );
}
