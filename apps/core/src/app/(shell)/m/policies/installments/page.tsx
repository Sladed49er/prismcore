import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listInstallments } from "@/lib/installments";
import { listPolicies } from "@/lib/policies";
import {
  InstallmentsPanel,
  type InstallmentDTO,
  type PolicyOption,
} from "@/components/installments-panel";

export default async function InstallmentsPage() {
  await requireModule("policies");
  const { config } = await loadCurrentTenant();
  const [instRows, policyRows] = await Promise.all([
    listInstallments(config.id),
    listPolicies(config.id),
  ]);

  const installments: InstallmentDTO[] = instRows.map((i) => ({
    id: i.id,
    policyNumber: i.policyNumber,
    installmentNumber: i.installmentNumber,
    dueDate: i.dueDate,
    amountCents: i.amountCents,
    paidCents: i.paidCents,
    status: i.status,
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
      <h1 className="mt-3 text-2xl font-semibold">Premium Schedule</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The installment billing schedule for each policy — due dates, amounts,
        and payments as they come in.
      </p>
      <InstallmentsPanel installments={installments} policies={policies} />
    </div>
  );
}
