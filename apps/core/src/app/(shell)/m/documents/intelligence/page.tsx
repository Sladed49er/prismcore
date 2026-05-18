import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listDocuments } from "@/lib/documents";
import { listAnalyses } from "@/lib/document-intelligence";
import {
  DocumentIntelligencePanel,
  type DocOption,
  type AnalysisDTO,
} from "@/components/document-intelligence-panel";

/** Document Intelligence — AI coverage review and document comparison. */
export default async function DocumentIntelligencePage() {
  await requireModule("documents");
  const { config } = await loadCurrentTenant();
  const [docRows, analysisRows] = await Promise.all([
    listDocuments(config.id),
    listAnalyses(config.id),
  ]);

  // Only documents with an uploaded file can be analysed.
  const documents: DocOption[] = docRows
    .filter((d) => d.storageUrl)
    .map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      mimeType: d.mimeType ?? "",
    }));

  const analyses: AnalysisDTO[] = analysisRows.map((a) => ({
    id: a.id,
    kind: a.kind,
    status: a.status,
    title: a.title,
    summary: a.summary,
    findings: a.findings,
    errorMessage: a.errorMessage,
    documentName: a.documentName,
    generatedBy: a.generatedBy,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/documents"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Documents
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Document Intelligence</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        AI review of any uploaded document — coverage gaps, exclusions, and
        limits on a single policy or form, or a side-by-side comparison of two
        documents such as an expiring policy against its renewal.
      </p>
      <DocumentIntelligencePanel documents={documents} analyses={analyses} />
    </div>
  );
}
