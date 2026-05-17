import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCertificateTemplates } from "@/lib/certificate-templates";
import {
  CertificateTemplatesPanel,
  type CertificateTemplateDTO,
} from "@/components/certificate-templates-panel";

export default async function CertificateTemplatesPage() {
  await requireModule("certificates");
  const { config } = await loadCurrentTenant();
  const rows = await listCertificateTemplates(config.id);

  const templates: CertificateTemplateDTO[] = rows.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    coverageSummary: t.coverageSummary,
    status: t.status,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/certificates"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Certificates
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Templates</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Reusable certificate templates — standard coverage summaries that issue
        the same way every time.
      </p>
      <CertificateTemplatesPanel templates={templates} />
    </div>
  );
}
