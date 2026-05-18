import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  adminDb,
  signatureRequests,
  type SignatureRequest,
  type SignField,
} from "@prismcore/db";

/**
 * eSign — a self-hosted signing ceremony.
 *
 * A request holds the agreement body and a field list; sending it stamps the
 * status and (optionally) emails the signer their link. The signer opens the
 * public `/sign/<token>` page — no login — fills the fields, types their name
 * as signature, and submits, which records `signedValues` / `signedName` /
 * `signedAt`. Tenant reads/writes are RLS-scoped; the two public entry points
 * (`getRequestByToken`, `submitSignature`) go through `adminDb`, scoped by the
 * token.
 */

export type { SignatureRequest, SignField };
export type EsignStatus = "draft" | "sent" | "signed" | "declined";

// ── Tenant-facing ──────────────────────────────────────────────────

export async function listSignatureRequests(
  tenantId: string,
): Promise<SignatureRequest[]> {
  return withTenantContext(tenantId, async (tx) =>
    tx
      .select()
      .from(signatureRequests)
      .where(eq(signatureRequests.tenantId, tenantId))
      .orderBy(desc(signatureRequests.createdAt)),
  );
}

export async function createSignatureRequest(input: {
  tenantId: string;
  documentName: string;
  signerName: string;
  signerEmail: string;
  body: string;
  fields: SignField[];
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(signatureRequests).values({
      tenantId: input.tenantId,
      documentName: input.documentName,
      signerName: input.signerName,
      signerEmail: input.signerEmail,
      body: input.body,
      fields: input.fields,
      publicToken: randomUUID().replaceAll("-", ""),
    });
  });
}

/** Edit a request — only meaningful while it is still a draft. */
export async function updateSignatureRequest(input: {
  tenantId: string;
  id: string;
  documentName: string;
  signerName: string;
  signerEmail: string;
  body: string;
  fields: SignField[];
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx
      .update(signatureRequests)
      .set({
        documentName: input.documentName,
        signerName: input.signerName,
        signerEmail: input.signerEmail,
        body: input.body,
        fields: input.fields,
        updatedAt: new Date(),
      })
      .where(eq(signatureRequests.id, input.id));
  });
}

/** Mark a request sent. Returns the signer email + token for the link mail. */
export async function markSent(
  tenantId: string,
  id: string,
): Promise<{ signerEmail: string; token: string } | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select()
      .from(signatureRequests)
      .where(eq(signatureRequests.id, id));
    if (!row) return null;
    await tx
      .update(signatureRequests)
      .set({
        status: "sent",
        sentDate: new Date().toISOString().slice(0, 10),
        updatedAt: new Date(),
      })
      .where(eq(signatureRequests.id, id));
    return { signerEmail: row.signerEmail, token: row.publicToken };
  });
}

export async function deleteSignatureRequest(
  tenantId: string,
  id: string,
): Promise<void> {
  await withTenantContext(tenantId, async (tx) => {
    await tx
      .delete(signatureRequests)
      .where(eq(signatureRequests.id, id));
  });
}

// ── Public (token-scoped, no session) ──────────────────────────────

/** Resolve a signature request by its public token. */
export async function getRequestByToken(
  token: string,
): Promise<SignatureRequest | null> {
  const [row] = await adminDb()
    .select()
    .from(signatureRequests)
    .where(eq(signatureRequests.publicToken, token));
  return row ?? null;
}

/** Record a completed signing ceremony. */
export async function submitSignature(
  token: string,
  signedValues: Record<string, string>,
  signedName: string,
): Promise<{ ok: boolean; message: string }> {
  const req = await getRequestByToken(token);
  if (!req) return { ok: false, message: "Signing request not found." };
  if (req.status === "signed") {
    return { ok: false, message: "This document is already signed." };
  }
  if (req.status === "declined") {
    return { ok: false, message: "This request was declined." };
  }
  if (!signedName.trim()) {
    return { ok: false, message: "Type your name to sign." };
  }
  for (const f of req.fields) {
    if (f.required && !(signedValues[f.key] ?? "").trim()) {
      return { ok: false, message: `"${f.label}" is required.` };
    }
  }
  await adminDb()
    .update(signatureRequests)
    .set({
      status: "signed",
      signedValues,
      signedName: signedName.trim(),
      signedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(signatureRequests.id, req.id));
  return { ok: true, message: "Signed — thank you." };
}

/** Record that the signer declined. */
export async function declineSignature(
  token: string,
  reason: string,
): Promise<{ ok: boolean; message: string }> {
  const req = await getRequestByToken(token);
  if (!req) return { ok: false, message: "Signing request not found." };
  if (req.status === "signed") {
    return { ok: false, message: "This document is already signed." };
  }
  await adminDb()
    .update(signatureRequests)
    .set({
      status: "declined",
      declinedReason: reason.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(signatureRequests.id, req.id));
  return { ok: true, message: "The request was declined." };
}
