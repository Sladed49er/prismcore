"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { currentActorName } from "@/lib/actor";
import { runReport, type ReportResult } from "@/lib/reports/engine";
import { saveReport, deleteReport } from "@/lib/reports/store";
import type { ReportSpec } from "@/lib/reports/spec";

/** Run a report spec and return its results. Read-only, tenant-scoped. */
export async function runReportAction(
  spec: ReportSpec,
): Promise<ReportResult> {
  const tenant = await getCurrentTenant();
  return runReport(tenant.id, spec);
}

/** Create or update a saved report. Returns its id. */
export async function saveReportAction(input: {
  id?: string;
  name: string;
  description?: string;
  spec: ReportSpec;
}): Promise<string> {
  const name = input.name.trim();
  if (!name) return input.id ?? "";
  const tenant = await getCurrentTenant();
  const id = await saveReport(tenant.id, {
    id: input.id,
    name,
    description: input.description?.trim() || null,
    spec: input.spec,
    createdBy: await currentActorName(),
  });
  revalidatePath("/m/reports");
  return id;
}

export async function deleteReportAction(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteReport(tenant.id, id);
  revalidatePath("/m/reports");
}
