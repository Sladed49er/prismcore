import { getPublishedForm } from "@/lib/intake-forms";
import { PublicIntakeForm } from "@/components/public-intake-form";

/** Public intake form — no login; resolved by the form's token. */
export const dynamic = "force-dynamic";

export default async function PublicIntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const form = await getPublishedForm(token);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        {form ? (
          <PublicIntakeForm
            token={token}
            name={form.name}
            description={form.description}
            fields={form.fields}
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-lg font-semibold">Form not available</p>
            <p className="mt-1 text-sm text-gray-600">
              This intake form is not published, or the link is no longer
              valid.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
