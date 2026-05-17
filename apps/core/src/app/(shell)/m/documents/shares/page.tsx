import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listDocumentShares } from "@/lib/document-shares";
import { listDocuments } from "@/lib/documents";
import {
  DocumentSharesPanel,
  type DocumentShareDTO,
  type DocumentOption,
} from "@/components/document-shares-panel";

export default async function DocumentSharesPage() {
  await requireModule("documents");
  const { config } = await loadCurrentTenant();
  const [shareRows, documentRows] = await Promise.all([
    listDocumentShares(config.id),
    listDocuments(config.id),
  ]);

  const shares: DocumentShareDTO[] = shareRows.map((s) => ({
    id: s.id,
    documentName: s.documentName,
    label: s.label,
    recipient: s.recipient,
    expiresDate: s.expiresDate,
    status: s.status,
  }));
  const documents: DocumentOption[] = documentRows.map((d) => ({
    id: d.id,
    label: d.name,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/documents"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Documents
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Shared Links</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Shareable links to documents — sent to a recipient, given an expiry,
        and revocable at any time.
      </p>
      <DocumentSharesPanel shares={shares} documents={documents} />
    </div>
  );
}
