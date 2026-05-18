"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createSignatureRequest,
  updateSignatureRequest,
  markSent,
  deleteSignatureRequest,
} from "@/lib/esign";
import { sendEmail, escapeHtml } from "@/lib/email";
import type { SignField } from "@prismcore/db";

const PATH = "/m/esign";

export async function createRequest(input: {
  documentName: string;
  signerName: string;
  signerEmail: string;
  body: string;
  fields: SignField[];
}): Promise<void> {
  if (!input.documentName.trim() || !input.signerName.trim()) return;
  const tenant = await getCurrentTenant();
  await createSignatureRequest({
    tenantId: tenant.id,
    documentName: input.documentName.trim(),
    signerName: input.signerName.trim(),
    signerEmail: input.signerEmail.trim(),
    body: input.body,
    fields: input.fields,
  });
  revalidatePath(PATH);
}

export async function updateRequest(input: {
  id: string;
  documentName: string;
  signerName: string;
  signerEmail: string;
  body: string;
  fields: SignField[];
}): Promise<void> {
  if (!input.documentName.trim() || !input.signerName.trim()) return;
  const tenant = await getCurrentTenant();
  await updateSignatureRequest({ tenantId: tenant.id, ...input });
  revalidatePath(PATH);
}

/** Mark a request sent and email the signer their signing link. */
export async function sendRequest(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  const tenant = await getCurrentTenant();
  const sent = await markSent(tenant.id, id);
  revalidatePath(PATH);
  if (!sent) return { ok: false, message: "Request not found." };

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const link = host ? `${proto}://${host}/sign/${sent.token}` : "";

  if (sent.signerEmail && link) {
    await sendEmail({
      to: sent.signerEmail,
      subject: "A document is ready for your signature",
      html: `<div style="font-family:system-ui,sans-serif;color:#111">
        <p>A document has been sent to you for electronic signature.</p>
        <p><a href="${escapeHtml(link)}">Review and sign the document</a></p>
      </div>`,
    });
  }
  return {
    ok: true,
    message: sent.signerEmail
      ? `Marked sent — signing link emailed to ${sent.signerEmail}.`
      : "Marked sent. Add a signer email to deliver the link by mail.",
  };
}

export async function removeRequest(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteSignatureRequest(tenant.id, id);
  revalidatePath(PATH);
}
