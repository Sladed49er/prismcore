import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listDocuments } from "@/lib/documents";
import { listCustomFields } from "@/lib/customization";
import {
  DocumentsPanel,
  type DocumentDTO,
  type CustomFieldDTO,
} from "@/components/documents-panel";

export default async function DocumentsPage() {
  await requireModule("documents");
  const { config } = await loadCurrentTenant();
  const [docRows, fieldRows] = await Promise.all([
    listDocuments(config.id),
    listCustomFields(config.id),
  ]);

  const documents: DocumentDTO[] = docRows.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    notes: d.notes,
  }));
  const customFields: CustomFieldDTO[] = fieldRows
    .filter((f) => f.entityKey === "document")
    .map((f) => ({
      fieldKey: f.fieldKey,
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
    }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Documents</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The document register — every form, policy document, and agreement on
        file.
      </p>
      <DocumentsPanel documents={documents} customFields={customFields} />
    </div>
  );
}
