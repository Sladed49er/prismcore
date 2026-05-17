"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenant } from "@/lib/current-tenant";
import {
  createClaimNote,
  type ClaimNoteCategory,
} from "@/lib/claim-notes";

export async function newClaimNote(input: {
  claimId: string;
  noteDate: string;
  author: string;
  category: ClaimNoteCategory;
  body: string;
}): Promise<void> {
  if (!input.claimId || !input.body.trim()) return;
  const tenant = await getCurrentTenant();
  await createClaimNote({
    tenantId: tenant.id,
    claimId: input.claimId,
    noteDate: input.noteDate || null,
    author: input.author.trim(),
    category: input.category,
    body: input.body.trim(),
  });
  revalidatePath("/m/claims/diary");
}
