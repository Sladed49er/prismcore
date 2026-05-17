import { requireModule } from "@/lib/kernel";

export default async function DocumentsPage() {
  await requireModule("documents");

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-2xl font-semibold">Documents</h1>
      <p className="mt-2 text-gray-600">
        Module shell. Document storage, comparison, and gap analysis pour in here
        (Days 7&ndash;10).
      </p>
    </div>
  );
}
