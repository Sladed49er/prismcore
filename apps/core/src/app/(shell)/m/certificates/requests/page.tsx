import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCertificateRequests } from "@/lib/certificate-requests";
import {
  CertificateRequestsPanel,
  type CertificateRequestDTO,
} from "@/components/certificate-requests-panel";

export default async function CertificateRequestsPage() {
  await requireModule("certificates");
  const { config } = await loadCurrentTenant();
  const rows = await listCertificateRequests(config.id);

  const requests: CertificateRequestDTO[] = rows.map((r) => ({
    id: r.id,
    holderName: r.holderName,
    requestedBy: r.requestedBy,
    policyReference: r.policyReference,
    neededByDate: r.neededByDate,
    status: r.status,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/m/certificates"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Certificates
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Requests</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Inbound certificate requests — worked from open through issued, so no
        holder is left waiting.
      </p>
      <CertificateRequestsPanel requests={requests} />
    </div>
  );
}
