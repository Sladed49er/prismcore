import Link from "next/link";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listClaimNotes } from "@/lib/claim-notes";
import { listClaims } from "@/lib/claims";
import {
  ClaimDiaryPanel,
  type ClaimNoteDTO,
  type ClaimOption,
} from "@/components/claim-diary-panel";

export default async function ClaimDiaryPage() {
  await requireModule("claims");
  const { config } = await loadCurrentTenant();
  const [noteRows, claimRows] = await Promise.all([
    listClaimNotes(config.id),
    listClaims(config.id),
  ]);

  const notes: ClaimNoteDTO[] = noteRows.map((n) => ({
    id: n.id,
    claimNumber: n.claimNumber,
    noteDate: n.noteDate,
    author: n.author,
    category: n.category,
    body: n.body,
  }));
  const claims: ClaimOption[] = claimRows.map((c) => ({
    id: c.id,
    label: `${c.claimNumber} — ${c.clientName}`,
  }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href="/m/claims"
        className="text-sm text-gray-400 transition hover:text-gray-600"
      >
        ← Claims
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Claim Diary</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        The chronological record on every claim — diary entries, contacts,
        coverage notes, and investigation findings.
      </p>
      <ClaimDiaryPanel notes={notes} claims={claims} />
    </div>
  );
}
