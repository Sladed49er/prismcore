import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClaimPayments } from "@/lib/claim-payments";
import { listClaims } from "@/lib/claims";
import {
  ClaimPaymentsPanel,
  type ClaimPaymentDTO,
  type ClaimOption,
} from "@/components/claim-payments-panel";

export default async function ClaimPaymentsPage() {
  await requireModule("claims");
  const { config } = await loadCurrentTenant();
  const [paymentRows, claimRows] = await Promise.all([
    listClaimPayments(config.id),
    listClaims(config.id),
  ]);

  const payments: ClaimPaymentDTO[] = paymentRows.map((p) => ({
    id: p.id,
    claimNumber: p.claimNumber,
    paymentDate: p.paymentDate,
    payee: p.payee,
    paymentType: p.paymentType,
    amountCents: p.amountCents,
    checkNumber: p.checkNumber,
    status: p.status,
  }));
  const claims: ClaimOption[] = claimRows.map((c) => ({
    id: c.id,
    label: `${c.claimNumber} — ${c.clientName}`,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/claims"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Claims
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Claim Payments</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Loss and expense payments issued on each claim — indemnity, expense,
        legal, and medical, tracked through clearing.
      </p>
      <ClaimPaymentsPanel payments={payments} claims={claims} />
    </div>
  );
}
