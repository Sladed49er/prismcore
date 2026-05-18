import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  documentAnalyses,
  documents,
  policies,
  clients,
  type DocFinding,
  type DocumentAnalysis,
} from "@prismcore/db";
import { getDocument } from "@/lib/documents";
import { clientDisplayName } from "@/lib/clients";
import { listAttachmentsByEntity } from "@/lib/document-attachments";

/**
 * Document intelligence — AI review, comparison, and cross-policy audit of
 * stored documents.
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

Call record_analysis ONCE with:
- a short title naming the document
- a 2-4 sentence plain-language summary
- score: a 0-100 coverage-health score (100 = clean, well-structured, no gaps; lower as gaps and problems mount)
- extractedData: the key fields you can read off the document as a flat object of string values — include whichever apply: namedInsured, carrier, policyNumber, lineOfBusiness, effectiveDate, expirationDate, totalPremium, and notable limits
- 3-8 findings, each with a short category, a title, a one-to-two sentence detail, and a severity: info (neutral note), watch (worth attention), or gap (a coverage gap or material problem).`;

const COMPARE_SYSTEM = `You are a commercial and personal lines insurance document reviewer for Prism Core, a platform for independent insurance agencies.

You are given TWO documents: DOCUMENT A (the prior or baseline) and DOCUMENT B (the new or proposed — often a renewal or a competing quote). Compare them for the agency.

Identify what changed from A to B:
- Coverages added or removed.
- Limit, sub-limit, and deductible changes — state the old and new values.
- Premium changes.
- New or removed exclusions, endorsements, or conditions.
- Coverage gaps introduced by the change.
- Named insured, location, or term differences.

Call record_analysis ONCE: a short title naming the comparison, a 2-4 sentence plain-language summary of the net effect, and 3-10 findings. Each finding has a short category, a title, a one-to-two sentence detail with specific values where possible, and a severity: info (neutral change), watch (worth attention), or gap (a coverage gap or material downgrade). Leave score and extractedData empty for a comparison.`;

const AUDIT_SYSTEM = `You are a commercial and personal lines insurance account reviewer for Prism Core, a platform for independent insurance agencies.

You are given EVERY document on file for one client — their policies, forms, and certificates together. Audit the account as a whole.

Look across the documents for:
- Coverage gaps at the account level — an exposure no policy covers (e.g. no umbrella over the auto and home, no cyber, no flood, no EPLI).
- Inconsistencies between documents — named insured, address, or entity name that does not match across policies.
- Overlapping or duplicated coverage the client is paying for twice.
- Policies that have lapsed or are about to expire.
- Limits that are inconsistent with the rest of the account's exposure.
- Account-rounding opportunities — lines a similar client would normally carry.

Call record_analysis ONCE: a short title naming the client audit, a 3-5 sentence summary of the account's coverage posture, and 4-12 findings. Each finding has a short category, a title, a one-to-two sentence detail, and a severity: info (neutral note), watch (worth attention), or gap (a coverage gap or material problem). Leave score and extractedData empty for an audit.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "record_analysis",
    description: "Record the document analysis. Call exactly once.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        score: {
          type: "number",
          description: "0-100 coverage-health score — single-document review only",
        },
        extractedData: {
          type: "object",
          description: "Key fields read off the document — review only",
          additionalProperties: { type: "string" },
        },
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

/** Validate the model's score into a 0-100 integer, or null. */
function cleanScore(raw: unknown): number | null {
  if (typeof raw !== "number" || Number.isNaN(raw)) return null;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** Validate the model's extracted data into a flat string map, or null. */
function cleanExtracted(raw: unknown): Record<string, string> | null {
  if (typeof raw !== "object" || raw === null) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v == null || v === "") continue;
    out[k.slice(0, 60)] = String(v).slice(0, 300);
  }
  return Object.keys(out).length > 0 ? out : null;
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

interface ModelOutput {
  title: string;
  summary: string;
  findings: DocFinding[];
  score: number | null;
  extractedData: Record<string, string> | null;
}

/** Insert the finished (or failed) analysis row, RLS-scoped. */
async function saveAnalysis(input: {
  tenantId: string;
  kind: "review" | "compare" | "audit";
  documentId: string | null;
  compareDocumentId: string | null;
  clientId: string | null;
  status: "complete" | "failed";
  title: string;
  summary: string;
  score: number | null;
  extractedData: Record<string, string> | null;
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
      clientId: input.clientId,
      status: input.status,
      title: input.title,
      summary: input.summary,
      score: input.score,
      extractedData: input.extractedData,
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
): Promise<ModelOutput> {
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
    score: cleanScore(raw.score),
    extractedData: cleanExtracted(raw.extractedData),
  };
}

/** AI coverage review of a single document — with a score and extracted data. */
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
      clientId: null,
      status: "complete",
      title: out.title || `Review — ${doc.name}`,
      summary: out.summary,
      score: out.score,
      extractedData: out.extractedData,
      findings: out.findings,
      errorMessage: "",
      generatedBy: actorName,
    });
    return {
      ok: true,
      message: `Reviewed "${doc.name}" — ${out.findings.length} findings${
        out.score !== null ? `, score ${out.score}/100` : ""
      }.`,
    };
  } catch (error) {
    await saveAnalysis({
      tenantId,
      kind: "review",
      documentId,
      compareDocumentId: null,
      clientId: null,
      status: "failed",
      title: `Review — ${doc.name}`,
      summary: "",
      score: null,
      extractedData: null,
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
      clientId: null,
      status: "complete",
      title: out.title || `${docA.name} vs ${docB.name}`,
      summary: out.summary,
      score: null,
      extractedData: null,
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
      clientId: null,
      status: "failed",
      title: `${docA.name} vs ${docB.name}`,
      summary: "",
      score: null,
      extractedData: null,
      findings: [],
      errorMessage: msg(error),
      generatedBy: actorName,
    });
    return { ok: false, message: msg(error) };
  }
}

/** The most documents a client audit will read, to bound the request. */
const AUDIT_DOC_LIMIT = 6;

/** Gather the readable documents attached to a client and their policies. */
async function gatherClientDocs(
  tenantId: string,
  clientId: string,
): Promise<ReadableDoc[]> {
  const policyIds = await withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ id: policies.id })
      .from(policies)
      .where(eq(policies.clientId, clientId));
    return rows.map((r) => r.id);
  });

  const [onClient, onPolicies] = await Promise.all([
    listAttachmentsByEntity(tenantId, "client", [clientId]),
    listAttachmentsByEntity(tenantId, "policy", policyIds),
  ]);

  const seen = new Set<string>();
  const docs: ReadableDoc[] = [];
  for (const group of [onClient, onPolicies]) {
    for (const rows of Object.values(group)) {
      for (const a of rows) {
        if (seen.has(a.documentId) || !a.storageUrl) continue;
        seen.add(a.documentId);
        docs.push({
          id: a.documentId,
          name: a.name,
          storageUrl: a.storageUrl,
          mimeType: a.mimeType ?? "",
        });
      }
    }
  }
  return docs.slice(0, AUDIT_DOC_LIMIT);
}

/** AI cross-policy audit of every document on one client. */
export async function runClientAudit(
  tenantId: string,
  clientId: string,
  actorName: string,
): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      message: "Document intelligence is not configured (no ANTHROPIC_API_KEY).",
    };
  }

  const client = await withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));
    return row ?? null;
  });
  if (!client) return { ok: false, message: "Client not found." };
  const clientName = clientDisplayName(client);

  const docs = await gatherClientDocs(tenantId, clientId);
  if (docs.length === 0) {
    return {
      ok: false,
      message: `No documents are attached to ${clientName} or their policies — attach files first.`,
    };
  }

  try {
    const content: Anthropic.ContentBlockParam[] = [
      {
        type: "text",
        text: `Audit the insurance account for "${clientName}". Every document on file follows.`,
      },
    ];
    for (const doc of docs) {
      content.push({ type: "text", text: `--- DOCUMENT: ${doc.name} ---` });
      content.push(...(await docBlocks(doc)));
    }
    const out = await callModel(apiKey, AUDIT_SYSTEM, content);
    await saveAnalysis({
      tenantId,
      kind: "audit",
      documentId: null,
      compareDocumentId: null,
      clientId,
      status: "complete",
      title: out.title || `Account audit — ${clientName}`,
      summary: out.summary,
      score: null,
      extractedData: null,
      findings: out.findings,
      errorMessage: "",
      generatedBy: actorName,
    });
    return {
      ok: true,
      message: `Audited ${clientName} across ${docs.length} document${
        docs.length === 1 ? "" : "s"
      } — ${out.findings.length} findings.`,
    };
  } catch (error) {
    await saveAnalysis({
      tenantId,
      kind: "audit",
      documentId: null,
      compareDocumentId: null,
      clientId,
      status: "failed",
      title: `Account audit — ${clientName}`,
      summary: "",
      score: null,
      extractedData: null,
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

/** One stored analysis, joined to the name of its source document if any. */
export interface AnalysisRow {
  id: string;
  kind: string;
  status: string;
  title: string;
  summary: string;
  score: number | null;
  extractedData: Record<string, string> | null;
  findings: DocFinding[];
  errorMessage: string;
  documentName: string | null;
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
        score: documentAnalyses.score,
        extractedData: documentAnalyses.extractedData,
        findings: documentAnalyses.findings,
        errorMessage: documentAnalyses.errorMessage,
        documentName: documents.name,
        generatedBy: documentAnalyses.generatedBy,
        createdAt: documentAnalyses.createdAt,
      })
      .from(documentAnalyses)
      .leftJoin(documents, eq(documents.id, documentAnalyses.documentId))
      .where(eq(documentAnalyses.tenantId, tenantId))
      .orderBy(desc(documentAnalyses.createdAt));
    return rows;
  });
}

export interface AnalysisStats {
  total: number;
  reviews: number;
  comparisons: number;
  audits: number;
  /** Gap-severity findings raised in the last 30 days. */
  gapsLast30d: number;
  /** Average review score, or null when nothing has been scored. */
  averageScore: number | null;
}

/** Roll up the tenant's document-intelligence activity. */
export async function getAnalysisStats(
  tenantId: string,
): Promise<AnalysisStats> {
  const rows = await listAnalyses(tenantId);
  const cutoff = Date.now() - 30 * 86_400_000;
  let gaps = 0;
  let scoreSum = 0;
  let scoreN = 0;
  for (const r of rows) {
    if (r.createdAt.getTime() >= cutoff) {
      gaps += r.findings.filter((f) => f.severity === "gap").length;
    }
    if (r.kind === "review" && r.score !== null) {
      scoreSum += r.score;
      scoreN++;
    }
  }
  return {
    total: rows.length,
    reviews: rows.filter((r) => r.kind === "review").length,
    comparisons: rows.filter((r) => r.kind === "compare").length,
    audits: rows.filter((r) => r.kind === "audit").length,
    gapsLast30d: gaps,
    averageScore: scoreN > 0 ? Math.round(scoreSum / scoreN) : null,
  };
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
