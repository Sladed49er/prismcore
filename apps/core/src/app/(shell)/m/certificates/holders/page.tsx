import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCertificateHolders } from "@/lib/certificate-holders";
import {
  CertificateHoldersPanel,
  type CertificateHolderDTO,
} from "@/components/certificate-holders-panel";

export default async function CertificateHoldersPage() {
  await requireModule("certificates");
  const { config } = await loadCurrentTenant();
  const rows = await listCertificateHolders(config.id);

  const holders: CertificateHolderDTO[] = rows.map((h) => ({
    id: h.id,
    name: h.name,
    address: h.address,
    contactName: h.contactName,
    email: h.email,
    phone: h.phone,
    notes: h.notes,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/certificates"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Certificates
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Holders</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The parties that require certificates of insurance — landlords,
        general contractors, vendors — kept on file for fast reissue.
      </p>
      <CertificateHoldersPanel holders={holders} />
    </div>
  );
}
