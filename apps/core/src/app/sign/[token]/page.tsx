import { getRequestByToken } from "@/lib/esign";
import { PublicSignForm } from "@/components/public-sign-form";

/** Public eSign ceremony — no login; resolved by the request token. */
export const dynamic = "force-dynamic";

export default async function PublicSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const req = await getRequestByToken(token);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-xl">
        {req ? (
          <PublicSignForm
            token={token}
            documentName={req.documentName}
            signerName={req.signerName}
            body={req.body}
            fields={req.fields}
            initialStatus={req.status}
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-lg font-semibold">Document not found</p>
            <p className="mt-1 text-sm text-gray-600">
              This signing link is not valid.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
