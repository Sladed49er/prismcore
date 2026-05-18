import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  documentAnalyses,
  documents,
  type DocFinding,
  type DocumentAnalysis,
} from "@prismcore/db";
import { getDocument } from "@/lib/documents";

/**
 * Document intelligence — AI review and comparison of stored documents.
 *
 * Claude reads the actual files natively (PDFs and images), so the model
 * sees the real document, not a lossy text extraction. It returns findings
 * through one forced tool call; trusted code validates the shape and writes
 * the analysis RLS-scoped. The model never writes to the database itself —
 * same safety model as the other Prism Core assistants.
 */

const MODEL = "claude-sonnet-4-6";
const SEVERITIES: DocFinding["severity"][] = ["info", "watch", "gap"];

export type { DocFinding, DocumentAnalysis };

const REVIEW_SYSTEM = `You are a commercial and personal lines insurance document reviewer for Prism Core, a platform for independent insurance agencies.

You are given one document — typically a policy, ACORD form, quote, endorsement, or certificate. Read it and review it for the agency.

Look for:
- Coverage gaps — exposures a reasonable insured would expect covered that are not, or are sub-limited.
- Exclusions and conditions that materially narrow the coverage.
- Limits and deductibles that look low, unusual, or inconsistent.
- Dates — effective, expiration, retroactive — and anything expiring or lapsed.
- Missing or blank fields, unsigned forms, named-insured or address inconsistencies.
- Anything notably well-structured worth reinforcing.

Call record_analysis ONCE: a short title naming the document, a 2-4 sentence plain-language summary, and 3-8 findings. Each finding has a short category, a title, a one-to-two sentence detail, and a severity: info (neutral note), watch (worth attention), or gap (a coverage gap or material problem).`;

const COMPARE_SYSTEM = `You are a commercial and personal lines insurance document reviewer for Prism Core, a platform for independent insurance agencies.

You are given TWO documents: DOCUMENT A (the prior or baseline) and DOCUMENT B (the new or proposed — often a renewal or a competing quote). Compare them for the agency.

Identify what changed from A to B:
- Coverages added or removed.
- Limit, sub-limit, and deductible changes — state the old and new values.
- Premium changes.
- New or removed exclusions, endorsements, or conditions.
- Coverage gaps introduced by the change.
- Named insured, location, or term differences.

Call record_analysis ONCE: a short title naming the comparison, a 2-4 sentence plain-language summary of the net effect, and 3-10 findings. Each finding has a short category, a title, a one-to-two sentence detail with specific values where possible, and a severity: info (neutral change), watch (worth attention), or gap (a coverage gap or material downgrade).`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "record_analysis",
    description: "Record the document analysis. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              title: { type: "string" },
              detail: { type: "string" },
              severity: { type: "string", enum: ["info", "watch", "gap"] },
            },
            required: ["category", "title", "detail", "severity"],
          },
        },
      },
      required: ["title", "summary", "findings"],
    },
  },
];

/** A document the model can actually read — has a stored file. */
interface ReadableDoc {
  id: string;
  name: string;
  storageUrl: string;
  mimeType: string;
}

/**
 * Turn a stored document into the content blocks Claude can read. PDFs and
 * images go in natively by URL; plain-text files are fetched and embedded.
 * Anything else throws — the caller surfaces the message.
 */
async function docBlocks(
  doc: ReadableDoc,
): Promise<Anthropic.ContentBlockParam[]> {
  const mime = doc.mimeType.toLowerCase();
  if (mime === "application/pdf") {
    return [
      { type: "document", source: { type: "url", url: doc.storageUrl } },
    ];
  }
  if (mime.startsWith("image/")) {
    return [{ type: "image", source: { type: "url", url: doc.storageUrl } }];
  }
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/csv"
  ) {
    const res = await fetch(doc.storageUrl);
    if (!res.ok) throw new Error(`Could not read "${doc.name}".`);
    const text = (await res.text()).slice(0, 200_000);
    return [{ type: "text", text: `--- ${doc.name} ---\n${text}` }];
  }
  throw new Error(
    `"${doc.name}" is a ${doc.mimeType || "binary"} file — document intelligence reads PDFs, images, and text files. Convert it to PDF and re-upload.`,
  );
}

/** Validate the model's findings into the stored shape. */
function cleanFindings(raw: unknown): DocFinding[] {
  return (Array.isArray(raw) ? raw : [])
    .filter(
      (f): f is Record<string, unknown> =>
        typeof f === "object" && f !== null,
    )
    .map((f) => ({
      category: String(f.category ?? "").slice(0, 80),
      title: String(f.title ?? "").slice(0, 200),
      detail: String(f.detail ?? "").slice(0, 1000),
      severity: SEVERITIES.includes(f.severity as DocFinding["severity"])
        ? (f.severity as DocFinding["severity"])
        : "watch",
    }))
    .filter((f) => f.title);
}

/** Fetch a document and assert it has a readable file. */
async function requireReadable(
  tenantId: string,
  documentId: string,
): Promise<ReadableDoc> {
  const doc = await getDocument(tenantId, documentId);
  if (!doc) throw new Error("Document not found.");
  if (!doc.storageUrl) {
    throw new Error(
      `"${doc.name}" is a register-only entry with no uploaded file — nothing to analyse.`,
    );
  }
  return {
    id: doc.id,
    name: doc.name,
    storageUrl: doc.storageUrl,
    mimeType: doc.mimeType ?? "",
  };
}

export interface AnalysisResult {
  ok: boolean;
  message: string;
}

/** Insert the finished (or failed) analysis row, RLS-scoped. */
async function saveAnalysis(input: {
  tenantId: string;
  kind: "review" | "compare";
  documentId: string;
  compareDocumentId: string | null;
  status: "complete" | "failed";
  title: string;
  summary: string;
  findings: DocFinding[];
  errorMessage: string;
  generatedBy: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(documentAnalyses).values({
      tenantId: input.tenantId,
      kind: input.kind,
      documentId: input.documentId,
      compareDocumentId: input.compareDocumentId,
      status: input.status,
      title: input.title,
      summary: input.summary,
      findings: input.findings,
      errorMessage: input.errorMessage,
      generatedBy: input.generatedBy,
      completedAt: new Date(),
    });
  });
}

/** Run the model and pull the single forced tool call's input. */
async function callModel(
  apiKey: string,
  system: string,
  content: Anthropic.ContentBlockParam[],
): Promise<{ title: string; summary: string; findings: DocFinding[] }> {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3072,
    system,
    tools: TOOLS,
    tool_choice: { type: "tool", name: "record_analysis" },
    messages: [{ role: "user", content }],
  });
  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  const raw = (toolUse?.input ?? {}) as Record<string, unknown>;
  return {
    title: String(raw.title ?? "").slice(0, 200),
    summary: String(raw.summary ?? "").slice(0, 2000),
    findings: cleanFindings(raw.findings),
  };
}

/** AI coverage review of a single document. */
export async function runReview(
  tenantId: string,
  documentId: string,
  actorName: string,
): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      message: "Document intelligence is not configured (no ANTHROPIC_API_KEY).",
    };
  }

  let doc: ReadableDoc;
  try {
    doc = await requireReadable(tenantId, documentId);
  } catch (error) {
    return { ok: false, message: msg(error) };
  }

  try {
    const blocks = await docBlocks(doc);
    const out = await callModel(apiKey, REVIEW_SYSTEM, [
      { type: "text", text: `Review this document: "${doc.name}".` },
      ...blocks,
    ]);
    await saveAnalysis({
      tenantId,
      kind: "review",
      documentId,
      compareDocumentId: null,
      status: "complete",
      title: out.title || `Review — ${doc.name}`,
      summary: out.summary,
      findings: out.findings,
      errorMessage: "",
      generatedBy: actorName,
    });
    return {
      ok: true,
      message: `Reviewed "${doc.name}" — ${out.findings.length} findings.`,
    };
  } catch (error) {
    await saveAnalysis({
      tenantId,
      kind: "review",
      documentId,
      compareDocumentId: null,
      status: "failed",
      title: `Review — ${doc.name}`,
      summary: "",
      findings: [],
      errorMessage: msg(error),
      generatedBy: actorName,
    });
    return { ok: false, message: msg(error) };
  }
}

/** AI comparison of two documents — e.g. an expiring policy vs its renewal. */
export async function runComparison(
  tenantId: string,
  documentId: string,
  compareDocumentId: string,
  actorName: string,
): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      message: "Document intelligence is not configured (no ANTHROPIC_API_KEY).",
    };
  }
  if (documentId === compareDocumentId) {
    return { ok: false, message: "Pick two different documents to compare." };
  }

  let docA: ReadableDoc;
  let docB: ReadableDoc;
  try {
    [docA, docB] = await Promise.all([
      requireReadable(tenantId, documentId),
      requireReadable(tenantId, compareDocumentId),
    ]);
  } catch (error) {
    return { ok: false, message: msg(error) };
  }

  try {
    const [blocksA, blocksB] = await Promise.all([
      docBlocks(docA),
      docBlocks(docB),
    ]);
    const out = await callModel(apiKey, COMPARE_SYSTEM, [
      { type: "text", text: `DOCUMENT A (prior / baseline): "${docA.name}"` },
      ...blocksA,
      { type: "text", text: `DOCUMENT B (new / proposed): "${docB.name}"` },
      ...blocksB,
    ]);
    await saveAnalysis({
      tenantId,
      kind: "compare",
      documentId,
      compareDocumentId,
      status: "complete",
      title: out.title || `${docA.name} vs ${docB.name}`,
      summary: out.summary,
      findings: out.findings,
      errorMessage: "",
      generatedBy: actorName,
    });
    return {
      ok: true,
      message: `Compared "${docA.name}" and "${docB.name}" — ${out.findings.length} findings.`,
    };
  } catch (error) {
    await saveAnalysis({
      tenantId,
      kind: "compare",
      documentId,
      compareDocumentId,
      status: "failed",
      title: `${docA.name} vs ${docB.name}`,
      summary: "",
      findings: [],
      errorMessage: msg(error),
      generatedBy: actorName,
    });
    return { ok: false, message: msg(error) };
  }
}

function msg(error: unknown): string {
  return error instanceof Error ? error.message : "Analysis failed.";
}

/** One stored analysis, joined to the names of its source documents. */
export interface AnalysisRow {
  id: string;
  kind: string;
  status: string;
  title: string;
  summary: string;
  findings: DocFinding[];
  errorMessage: string;
  documentName: string;
  generatedBy: string;
  createdAt: Date;
}

/** Every analysis for the tenant, newest first. */
export async function listAnalyses(tenantId: string): Promise<AnalysisRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: documentAnalyses.id,
        kind: documentAnalyses.kind,
        status: documentAnalyses.status,
        title: documentAnalyses.title,
        summary: documentAnalyses.summary,
        findings: documentAnalyses.findings,
        errorMessage: documentAnalyses.errorMessage,
        documentName: documents.name,
        generatedBy: documentAnalyses.generatedBy,
        createdAt: documentAnalyses.createdAt,
      })
      .from(documentAnalyses)
      .innerJoin(documents, eq(documents.id, documentAnalyses.documentId))
      .where(eq(documentAnalyses.tenantId, tenantId))
      .orderBy(desc(documentAnalyses.createdAt));
    return rows;
  });
}

/** Delete an analysis. */
export async function deleteAnalysis(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(documentAnalyses)
      .where(
        and(
          eq(documentAnalyses.id, id),
          eq(documentAnalyses.tenantId, tenantId),
        ),
      );
  });
}
