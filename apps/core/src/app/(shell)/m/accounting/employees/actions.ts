"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type EmploymentType,
} from "@/lib/payroll";

export async function addEmployee(input: {
  name: string;
  email: string;
  title: string;
  employmentType: EmploymentType;
  payDollars: string;
}): Promise<void> {
  if (!input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await createEmployee({
    tenantId: tenant.id,
    name: input.name.trim(),
    email: input.email.trim(),
    title: input.title.trim(),
    employmentType: input.employmentType,
    periodPayCents: Math.round((Number.parseFloat(input.payDollars) || 0) * 100),
  });
  revalidatePath("/m/accounting/employees");
}

export async function editEmployee(input: {
  id: string;
  name: string;
  email: string;
  title: string;
  employmentType: EmploymentType;
  payDollars: string;
  isActive: boolean;
}): Promise<void> {
  if (!input.id || !input.name.trim()) return;
  const tenant = await getCurrentTenant();
  await updateEmployee({
    tenantId: tenant.id,
    id: input.id,
    name: input.name.trim(),
    email: input.email.trim(),
    title: input.title.trim(),
    employmentType: input.employmentType,
    periodPayCents: Math.round(
      (Number.parseFloat(input.payDollars) || 0) * 100,
    ),
    isActive: input.isActive,
  });
  revalidatePath("/m/accounting/employees");
}

export async function removeEmployee(id: string): Promise<void> {
  if (!id) return;
  const tenant = await getCurrentTenant();
  await deleteEmployee(tenant.id, id);
  revalidatePath("/m/accounting/employees");
}
