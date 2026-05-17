import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listSignatureRequests } from "@/lib/esign";
import {
  EsignPanel,
  type SignatureRequestDTO,
} from "@/components/esign-panel";

export default async function EsignPage() {
  await requireModule("esign");
  const { config } = await loadCurrentTenant();
  const rows = await listSignatureRequests(config.id);

  const requests: SignatureRequestDTO[] = rows.map((r) => ({
    id: r.id,
    documentName: r.documentName,
    signerName: r.signerName,
    signerEmail: r.signerEmail,
    status: r.status,
    sentDate: r.sentDate,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Core
      </p>
      <h1 className="mt-1 text-2xl font-semibold">eSign &amp; PDF</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Electronic signature requests — sent, signed, and tracked.
      </p>
      <EsignPanel requests={requests} />
    </div>
  );
}
