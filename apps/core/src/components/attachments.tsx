"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { detachDocumentAction } from "./attachments-actions";

/** One attached file as the UI needs it — see `lib/document-attachments`. */
export interface AttachmentDTO {
  id: string;
  documentId: string;
  name: string;
  caption: string;
  storageUrl: string | null;
  fileSizeBytes: number | null;
  attachedByName: string;
}

function fileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Reusable attachments block — drop it onto any record in any module.
 *
 * Pass the record's `entityType` ("ticket", "client", "policy", …) and
 * `entityId`; the component lists every file attached to that record, lets
 * the user upload a new one straight onto it, and detach existing ones. The
 * upload posts to the shared `/api/documents/upload` route, which stores the
 * file in Vercel Blob and creates the attachment link in one request.
 */
export function Attachments({
  entityType,
  entityId,
  attachments,
  category = "Correspondence",
  compact = false,
}: {
  entityType: string;
  entityId: string;
  attachments: AttachmentDTO[];
  /** Library category the uploaded document is filed under. */
  category?: string;
  /** Tighter layout for inline use inside an expanded row. */
  compact?: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFilePicked(
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("category", category);
      body.append("entityType", entityType);
      body.append("entityId", entityId);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "Upload failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function detach(id: string): void {
    startTransition(async () => {
      await detachDocumentAction(id);
      router.refresh();
    });
  }

  return (
    <div className={compact ? "" : "mt-4"}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Attachments{attachments.length ? ` (${attachments.length})` : ""}
        </p>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "+ Attach file"}
        </button>
        <input
          ref={fileInput}
          type="file"
          onChange={onFilePicked}
          className="hidden"
        />
      </div>

      {error ? (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
          {error}
        </p>
      ) : null}

      {attachments.length === 0 ? (
        <p className="mt-2 text-xs text-gray-400">No files attached.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {a.storageUrl ? (
                  <a
                    href={a.storageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    {a.name}
                  </a>
                ) : (
                  a.name
                )}
                <span className="ml-2 text-xs text-gray-400">
                  {fileSize(a.fileSizeBytes)}
                  {a.fileSizeBytes ? " · " : ""}
                  {a.attachedByName}
                </span>
              </span>
              <button
                type="button"
                onClick={() => detach(a.id)}
                disabled={pending}
                className="shrink-0 text-xs text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
