import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listCommunicationLists } from "@/lib/communication-lists";
import {
  CommunicationListsPanel,
  type CommunicationListDTO,
} from "@/components/communication-lists-panel";

/**
 * Communication Lists module — committees, distribution lists, and member
 * groups an association uses to organize and reach its membership.
 */
export default async function CommunicationListsPage() {
  await requireModule("communication_lists");
  const { config } = await loadCurrentTenant();
  const rows = await listCommunicationLists(config.id);

  const lists: CommunicationListDTO[] = rows.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    purpose: l.purpose,
    memberCount: l.memberCount,
    ownerName: l.ownerName,
    isActive: l.isActive,
    notes: l.notes,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Association
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Communication Lists</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Committees, distribution lists, working groups, and the board — the
        groups you organize and communicate with across your membership.
      </p>
      <CommunicationListsPanel lists={lists} />
    </div>
  );
}
