import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import {
  listMemberBenefits,
  listBenefitRedemptions,
} from "@/lib/member-benefits";
import {
  MemberBenefitsPanel,
  type MemberBenefitDTO,
} from "@/components/member-benefits-panel";
import {
  BenefitRedemptionsPanel,
  type BenefitRedemptionDTO,
  type BenefitOption,
} from "@/components/benefit-redemptions-panel";

/**
 * Member Benefits module — the catalog of partner perks and the record of
 * each time a member redeems one.
 */
export default async function MemberBenefitsPage() {
  await requireModule("member_benefits");
  const { config } = await loadCurrentTenant();
  const [benefitRows, redemptionRows] = await Promise.all([
    listMemberBenefits(config.id),
    listBenefitRedemptions(config.id),
  ]);

  const benefits: MemberBenefitDTO[] = benefitRows.map((b) => ({
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

  const redemptions: BenefitRedemptionDTO[] = redemptionRows.map((r) => ({
    id: r.id,
    benefitName: r.benefitName,
    memberName: r.memberName,
    redeemedOn: r.redeemedOn,
    estimatedValueCents: r.estimatedValueCents,
    notes: r.notes,
  }));

  const benefitOptions: BenefitOption[] = benefitRows.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Association
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Member Benefits</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The perks of membership — partner discounts, services, and resources —
        and how much members are getting out of them.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Benefit catalog</h2>
      <MemberBenefitsPanel benefits={benefits} />

      <h2 className="mt-10 text-lg font-semibold">Redemptions</h2>
      <p className="mt-1 text-sm text-gray-500">
        Each time a member uses a benefit — a measure of the value delivered.
      </p>
      <BenefitRedemptionsPanel
        redemptions={redemptions}
        benefits={benefitOptions}
      />
    </div>
  );
}
