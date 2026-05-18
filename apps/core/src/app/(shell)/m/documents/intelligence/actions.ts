"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import { currentActorName } from "@/lib/actor";
import {
  runReview,
  runComparison,
  deleteAnalysis,
  type AnalysisResult,
} from "@/lib/document-intelligence";

/** AI coverage review of one document. */
export async function reviewDocument(
  documentId: string,
): Promise<AnalysisResult> {
  const [tenant, actor] = await Promise.all([
    getCurrentTenant(),
    currentActorName(),
  ]);
  const result = await runReview(tenant.id, documentId, actor);
  revalidatePath("/m/documents/intelligence");
  return result;
}

/** AI comparison of two documents. */
export async function compareDocuments(
  documentId: string,
  compareDocumentId: string,
): Promise<AnalysisResult> {
  const [tenant, actor] = await Promise.all([
    getCurrentTenant(),
    currentActorName(),
  ]);
  const result = await runComparison(
    tenant.id,
    documentId,
    compareDocumentId,
    actor,
  );
  revalidatePath("/m/documents/intelligence");
  return result;
}

export async function removeAnalysis(id: string): Promise<void> {
  const tenant = await getCurrentTenant();
  await deleteAnalysis(tenant.id, id);
  revalidatePath("/m/documents/intelligence");
}
