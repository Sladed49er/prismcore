import { requireModule } from "@/lib/kernel";

export default async function CallsPage() {
  await requireModule("telephony");

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-2xl font-semibold">Call Center</h1>
      <p className="mt-2 text-gray-600">
        Module shell. CallIntel &mdash; VoIP integration, screen pop, and AI call
        logging &mdash; folds in here as a module (Days 11&ndash;14).
      </p>
    </div>
  );
}
