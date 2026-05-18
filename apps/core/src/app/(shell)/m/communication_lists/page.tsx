import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import {
  listCommunicationLists,
  listCommunicationListMembers,
} from "@/lib/communication-lists";
import {
  CommunicationListsPanel,
  type CommunicationListDTO,
} from "@/components/communication-lists-panel";
import {
  CommunicationListMembersPanel,
  type ListMemberDTO,
  type ListOption,
} from "@/components/communication-list-members-panel";

/**
 * Communication Lists module — committees and distribution lists, and the
 * people on each.
 */
export default async function CommunicationListsPage() {
  await requireModule("communication_lists");
  const { config } = await loadCurrentTenant();
  const [listRows, memberRows] = await Promise.all([
    listCommunicationLists(config.id),
    listCommunicationListMembers(config.id),
  ]);

  const lists: CommunicationListDTO[] = listRows.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    purpose: l.purpose,
    memberCount: l.memberCount,
    ownerName: l.ownerName,
    isActive: l.isActive,
    notes: l.notes,
  }));

  const members: ListMemberDTO[] = memberRows.map((m) => ({
    id: m.id,
    listName: m.listName,
    name: m.name,
    email: m.email,
    role: m.role,
  }));

  const listOptions: ListOption[] = listRows.map((l) => ({
    id: l.id,
    name: l.name,
  }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Association
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Communication Lists</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Committees, distribution lists, working groups, and the board — and the
        people who make up each.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Lists</h2>
      <CommunicationListsPanel lists={lists} />

      <h2 className="mt-10 text-lg font-semibold">List members</h2>
      <p className="mt-1 text-sm text-gray-500">
        The people on each committee or distribution list.
      </p>
      <CommunicationListMembersPanel members={members} lists={listOptions} />
    </div>
  );
}
