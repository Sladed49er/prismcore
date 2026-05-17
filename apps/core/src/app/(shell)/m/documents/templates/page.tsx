import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listDocumentTemplates } from "@/lib/document-templates";
import {
  DocumentTemplatesPanel,
  type DocumentTemplateDTO,
} from "@/components/document-templates-panel";

export default async function DocumentTemplatesPage() {
  await requireModule("documents");
  const { config } = await loadCurrentTenant();
  const rows = await listDocumentTemplates(config.id);

  const templates: DocumentTemplateDTO[] = rows.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    status: t.status,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/documents"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Documents
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Templates</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Reusable document templates — proposals, letters, and forms, drafted
        and published for the team to use.
      </p>
      <DocumentTemplatesPanel templates={templates} />
    </div>
  );
}
