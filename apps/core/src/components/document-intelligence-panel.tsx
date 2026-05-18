"use client";

import { useState, useTransition } from "react";
import type { DocFinding } from "@prismcore/db";
import {
  reviewDocument,
  compareDocuments,
  removeAnalysis,
} from "@/app/(shell)/m/documents/intelligence/actions";

export interface DocOption {
  id: string;
  name: string;
  category: string;
  mimeType: string;
}

export interface AnalysisDTO {
  id: string;
  kind: string;
  status: string;
  title: string;
  summary: string;
  findings: DocFinding[];
  errorMessage: string;
  documentName: string;
  generatedBy: string;
  createdAt: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  info: "bg-gray-100 text-gray-600",
  watch: "bg-amber-50 text-amber-700",
  gap: "bg-rose-50 text-rose-700",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const selectClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function DocumentIntelligencePanel({
  documents,
  analyses,
}: {
  documents: DocOption[];
  analyses: AnalysisDTO[];
}) {
  const [pending, startTransition] = useTransition();
  const [reviewId, setReviewId] = useState("");
  const [docA, setDocA] = useState("");
  const [docB, setDocB] = useState("");
  const [status, setStatus] = useState<
    { ok: boolean; message: string } | null
  >(null);
  const [openId, setOpenId] = useState<string | null>(null);

  function review(): void {
    if (!reviewId) return;
    setStatus(null);
    startTransition(async () => {
      setStatus(await reviewDocument(reviewId));
    });
  }

  function compare(): void {
    if (!docA || !docB) return;
    setStatus(null);
    startTransition(async () => {
      setStatus(await compareDocuments(docA, docB));
    });
  }

  function remove(id: string): void {
    startTransition(async () => {
      await removeAnalysis(id);
    });
  }

  if (documents.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
        Upload a document in the library first — document intelligence reads
        PDFs, images, and text files.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Single-document review */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">Review a document</h2>
          <p className="mt-1 text-sm text-gray-600">
            Coverage gaps, exclusions, limits, and dates on one policy or form.
          </p>
          <label className={`${labelClass} mt-3 block`}>
            Document
            <select
              value={reviewId}
              onChange={(e) => setReviewId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select a document…</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={review}
            disabled={pending || !reviewId}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {pending ? "Analyzing…" : "Run review"}
          </button>
        </div>

        {/* Two-document comparison */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">Compare two documents</h2>
          <p className="mt-1 text-sm text-gray-600">
            What changed — e.g. an expiring policy against its renewal.
          </p>
          <label className={`${labelClass} mt-3 block`}>
            Document A — prior / baseline
            <select
              value={docA}
              onChange={(e) => setDocA(e.target.value)}
              className={selectClass}
            >
              <option value="">Select a document…</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className={`${labelClass} mt-2 block`}>
            Document B — new / proposed
            <select
              value={docB}
              onChange={(e) => setDocB(e.target.value)}
              className={selectClass}
            >
              <option value="">Select a document…</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={compare}
            disabled={pending || !docA || !docB || docA === docB}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {pending ? "Analyzing…" : "Run comparison"}
          </button>
        </div>
      </div>

      {status ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            status.ok
              ? "bg-green-50 text-green-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {status.message}
        </p>
      ) : null}

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Analyses
        </h2>
        {analyses.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
            No analyses yet.
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            {analyses.map((a) => {
              const isOpen = openId === a.id;
              const failed = a.status === "failed";
              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-gray-200 bg-white"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : a.id)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.kind === "compare"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {a.kind === "compare" ? "comparison" : "review"}
                      </span>
                      <span className="font-medium">
                        {a.title || a.documentName}
                      </span>
                      {failed ? (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                          failed
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {a.generatedBy} · {fmtDate(a.createdAt)}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="border-t border-gray-100 px-5 py-4">
                      {failed ? (
                        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                          {a.errorMessage || "Analysis failed."}
                        </p>
                      ) : (
                        <>
                          {a.summary ? (
                            <p className="text-sm text-gray-600">
                              {a.summary}
                            </p>
                          ) : null}
                          <ul className="mt-3 space-y-2">
                            {a.findings.map((f, i) => (
                              <li
                                key={i}
                                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                      SEVERITY_STYLE[f.severity] ??
                                      SEVERITY_STYLE.info
                                    }`}
                                  >
                                    {f.severity}
                                  </span>
                                  <span className="text-xs uppercase tracking-wide text-gray-400">
                                    {f.category}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm font-medium">
                                  {f.title}
                                </p>
                                <p className="mt-0.5 text-sm text-gray-600">
                                  {f.detail}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(a.id)}
                        disabled={pending}
                        className="mt-3 text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
                      >
                        Delete analysis
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
