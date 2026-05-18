import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listDocuments } from "@/lib/documents";
import { listClients, clientDisplayName } from "@/lib/clients";
import { listAnalyses, getAnalysisStats } from "@/lib/document-intelligence";
import {
  DocumentIntelligencePanel,
  type DocOption,
  type ClientOption,
  type AnalysisDTO,
  type StatsDTO,
} from "@/components/document-intelligence-panel";

/** Document Intelligence — AI review, comparison, and cross-policy audit. */
export default async function DocumentIntelligencePage() {
  await requireModule("documents");
  const { config } = await loadCurrentTenant();
  const [docRows, clientRows, analysisRows, stats] = await Promise.all([
    listDocuments(config.id),
    listClients(config.id),
    listAnalyses(config.id),
    getAnalysisStats(config.id),
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

  const clients: ClientOption[] = clientRows.map((c) => ({
    id: c.id,
    name: clientDisplayName(c),
  }));

  const analyses: AnalysisDTO[] = analysisRows.map((a) => ({
    id: a.id,
    kind: a.kind,
    status: a.status,
    title: a.title,
    summary: a.summary,
    score: a.score,
    extractedData: a.extractedData,
    findings: a.findings,
    errorMessage: a.errorMessage,
    documentName: a.documentName,
    generatedBy: a.generatedBy,
    createdAt: a.createdAt.toISOString(),
  }));

  const statsDto: StatsDTO = {
    total: stats.total,
    reviews: stats.reviews,
    comparisons: stats.comparisons,
    audits: stats.audits,
    gapsLast30d: stats.gapsLast30d,
    averageScore: stats.averageScore,
  };

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
        AI review of any uploaded document — coverage gaps, a 0-100 score, and
        extracted policy data — a side-by-side comparison of two documents, or
        a cross-policy audit of every document on a client.
      </p>
      <DocumentIntelligencePanel
        documents={documents}
        clients={clients}
        analyses={analyses}
        stats={statsDto}
      />
    </div>
  );
}
