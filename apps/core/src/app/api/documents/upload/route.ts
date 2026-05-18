import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentTenant } from "@/lib/current-tenant";
import { createUploadedDocument } from "@/lib/documents";

/** Reads the multipart body — never cache. */
export const dynamic = "force-dynamic";

/** Server-side upload caps at the serverless body limit. */
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Document upload — stores the file in Vercel Blob and records it in the
 * tenant's document store.
 *
 *   POST /api/documents/upload   (multipart: file, optional category, notes)
 *
 * Authenticated by the Clerk session (the route is not public); the file is
 * stored under a tenant-scoped path with an unguessable URL.
 */
export async function POST(request: Request): Promise<Response> {
  let tenantId: string;
  try {
    const tenant = await getCurrentTenant();
    tenantId = tenant.id;
  } catch {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "expected a multipart upload" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "no file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file is larger than the 4 MB upload limit" },
      { status: 413 },
    );
  }

  const category = (form.get("category")?.toString() || "General").trim();
  const notes = form.get("notes")?.toString().trim() ?? "";
  const safeName =
    file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";

  try {
    const blob = await put(
      `documents/${tenantId}/${Date.now()}-${safeName}`,
      file,
      { access: "public" },
    );
    const id = await createUploadedDocument({
      tenantId,
      name: file.name,
      category,
      notes,
      storageUrl: blob.url,
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
    });
    return NextResponse.json({ id, url: blob.url });
  } catch (error) {
    console.error("[documents/upload] failed:", error);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}
