import { headers } from "next/headers";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { loadTerms, moduleLabel } from "@/lib/terminology";
import { listSignatureRequests } from "@/lib/esign";
import {
  EsignPanel,
  type SignatureRequestDTO,
} from "@/components/esign-panel";

/** eSign — a self-hosted signing ceremony. */
export default async function EsignPage() {
  await requireModule("esign");
  const { config } = await loadCurrentTenant();
  const [terms, rows, hdrs] = await Promise.all([
    loadTerms(config.id),
    listSignatureRequests(config.id),
    headers(),
  ]);

  const requests: SignatureRequestDTO[] = rows.map((r) => ({
    id: r.id,
    documentName: r.documentName,
    signerName: r.signerName,
    signerEmail: r.signerEmail,
    body: r.body,
    fields: r.fields,
    status: r.status,
    publicToken: r.publicToken,
    signedName: r.signedName,
    signedAt: r.signedAt ? r.signedAt.toISOString() : null,
    signedValues: r.signedValues,
    declinedReason: r.declinedReason,
  }));

  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${proto}://${host}` : "";

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {moduleLabel(terms, "esign", "eSign & PDF")}
      </h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Build an agreement, send it for signature, and the signer completes a
        self-hosted ceremony — no separate e-sign account.
      </p>
      <EsignPanel requests={requests} baseUrl={baseUrl} />
    </div>
  );
}
