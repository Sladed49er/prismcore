import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listDocumentFolders } from "@/lib/document-folders";
import {
  DocumentFoldersPanel,
  type DocumentFolderDTO,
} from "@/components/document-folders-panel";

export default async function DocumentFoldersPage() {
  await requireModule("documents");
  const { config } = await loadCurrentTenant();
  const rows = await listDocumentFolders(config.id);

  const folders: DocumentFolderDTO[] = rows.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/documents"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Documents
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Folders</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The folder structure that organizes the document library — define the
        categories every document is filed under.
      </p>
      <DocumentFoldersPanel folders={folders} />
    </div>
  );
}
