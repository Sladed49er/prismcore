"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { currentActorName } from "@/lib/actor";
import { deleteBookScanReport } from "@/lib/bookscan";
import { runBookScan } from "@/lib/bookscan-assistant";

/** Run a fresh BookScan analysis; returns a short status line for the UI. */
export async function analyzeBook(): Promise<{
  ok: boolean;
  message: string;
}> {
  const [tenant, actor] = await Promise.all([
    getCurrentTenant(),
    currentActorName(),
  ]);
  const result = await runBookScan(tenant.id, actor);
  revalidatePath("/m/bookscan");
  return result;
}

export async function removeReport(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteBookScanReport(tenant.id, id);
  revalidatePath("/m/bookscan");
}
