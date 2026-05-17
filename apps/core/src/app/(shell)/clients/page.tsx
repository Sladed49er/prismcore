import { requireModule } from "@/lib/kernel";

export default async function ClientsPage() {
  await requireModule("clients");

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-2xl font-semibold">Clients &amp; CRM</h1>
      <p className="mt-2 text-gray-600">
        Module shell. The Clients module from PrismAMS pours in here onto the
        module-SDK contract (Days 7&ndash;10).
      </p>
    </div>
  );
}
