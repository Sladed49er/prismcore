import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listEmployees } from "@/lib/payroll";
import { EmployeesPanel, type EmployeeDTO } from "@/components/employees-panel";

export default async function EmployeesPage() {
  await requireModule("accounting");
  const { config } = await loadCurrentTenant();
  const rows = await listEmployees(config.id);

  const employees: EmployeeDTO[] = rows.map((e) => ({
    id: e.id,
    name: e.name,
    title: e.title,
    email: e.email,
    employmentType: e.employmentType,
    periodPayCents: e.periodPayCents,
    isActive: e.isActive,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/m/accounting"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Accounting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Employees</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The payroll employee master — W-2 staff and 1099 contractors.
      </p>
      <EmployeesPanel employees={employees} />
    </div>
  );
}
