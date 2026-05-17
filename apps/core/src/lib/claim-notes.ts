import { desc, eq } from "drizzle-orm";
import {
  withTenantContext,
  claimNotes,
  claims,
  type ClaimNote,
} from "@prismcore/db";

export type { ClaimNote };
export type ClaimNoteCategory =
  | "diary"
  | "contact"
  | "coverage"
  | "investigation"
  | "other";

export interface ClaimNoteRow extends ClaimNote {
  claimNumber: string;
}

export async function listClaimNotes(
  tenantId: string,
): Promise<ClaimNoteRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ note: claimNotes, claim: claims })
      .from(claimNotes)
      .leftJoin(claims, eq(claimNotes.claimId, claims.id))
      .where(eq(claimNotes.tenantId, tenantId))
      .orderBy(desc(claimNotes.createdAt));
    return rows.map((r) => ({
      ...r.note,
      claimNumber: r.claim?.claimNumber ?? "—",
    }));
  });
}

export async function createClaimNote(input: {
  tenantId: string;
  claimId: string;
  noteDate: string | null;
  author: string;
  category: ClaimNoteCategory;
  body: string;
}): Promise<void> {
  await withTenantContext(input.tenantId, async (tx) => {
    await tx.insert(claimNotes).values(input);
  });
}
