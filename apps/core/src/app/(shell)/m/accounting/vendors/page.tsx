import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listVendors } from "@/lib/ap";
import { VendorsPanel, type VendorDTO } from "@/components/vendors-panel";

export default async function VendorsPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const rows = await listVendors(config.id);

  const vendors: VendorDTO[] = rows.map((v) => ({
    id: v.id,
    name: v.name,
    type: v.type,
    email: v.email,
    phone: v.phone,
    paymentTerms: v.paymentTerms,
    is1099: v.is1099,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Vendors</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The accounts-payable master — carriers, suppliers, and service providers.
      </p>
      <VendorsPanel vendors={vendors} />
    </div>
  );
}
