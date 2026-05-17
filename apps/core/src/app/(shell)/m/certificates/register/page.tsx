import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCertificates } from "@/lib/certificates";
import { listPolicies } from "@/lib/policies";
import {
  CertificatesPanel,
  type CertificateDTO,
  type PolicyOption,
} from "@/components/certificates-panel";

/** Certificate register — every COI issued against a policy. */
export default async function CertificateRegisterPage() {
  await requireModule("certificates");
  const { config } = await loadCurrentTenant();
  const [certRows, policyRows] = await Promise.all([
    listCertificates(config.id),
    listPolicies(config.id),
  ]);

  const certificates: CertificateDTO[] = certRows.map((c) => ({
    id: c.id,
    certNumber: c.certNumber,
    holderName: c.holderName,
    policyNumber: c.policyNumber,
    clientName: c.clientName,
    issuedDate: c.issuedDate,
    status: c.status,
  }));
  const policies: PolicyOption[] = policyRows.map((p) => ({
    id: p.id,
    label: `${p.policyNumber} — ${p.clientName}`,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/certificates"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Certificates
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Certificate Register</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Every certificate of insurance issued to a holder against the
        agency&rsquo;s policies.
      </p>
      <CertificatesPanel certificates={certificates} policies={policies} />
    </div>
  );
}
