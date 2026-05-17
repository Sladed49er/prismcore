import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCertificates } from "@/lib/certificates";
import { listPolicies } from "@/lib/policies";
import {
  CertificatesPanel,
  type CertificateDTO,
  type PolicyOption,
} from "@/components/certificates-panel";

export default async function CertificatesPage() {
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
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Insurance
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Certificates</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Certificates of Insurance issued to holders against the agency&rsquo;s
        policies.
      </p>
      <CertificatesPanel certificates={certificates} policies={policies} />
    </div>
  );
}
