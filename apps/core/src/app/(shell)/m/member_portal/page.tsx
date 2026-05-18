import { headers } from "next/headers";
import { loadCurrentTenant, requireModule } from "@/lib/kernel";
import { listMemberships } from "@/lib/memberships";
import { listMemberPortalInvitations } from "@/lib/member-portal";
import {
  MemberPortalPanel,
  type MemberPortalInvitationDTO,
  type MemberOption,
} from "@/components/member-portal-panel";

/** The deployment's base URL, from the request headers. */
async function baseUrl(): Promise<string> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "core.prismams.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Member Portal module — the agency-facing side: invite members and manage
 * their revocable access links. The member-facing portal is the public
 * `/member-portal/[token]` route.
 */
export default async function MemberPortalPage() {
  await requireModule("member_portal");
  const { config } = await loadCurrentTenant();
  const [invitationRows, memberRows, base] = await Promise.all([
    listMemberPortalInvitations(config.id),
    listMemberships(config.id),
    baseUrl(),
  ]);

  const invitations: MemberPortalInvitationDTO[] = invitationRows.map((i) => ({
    id: i.id,
    memberName: i.memberName,
    email: i.email,
    token: i.token,
    status: i.status,
    lastViewedAt: i.lastViewedAt ? i.lastViewedAt.toISOString() : null,
  }));

  const members: MemberOption[] = memberRows
    .filter((m) => m.status !== "cancelled")
    .map((m) => ({ id: m.id, name: m.memberName, email: m.email }));

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        Association
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Member Portal</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Give members a read-only view of their membership, benefits, and
        upcoming events. Each member gets a unique, revocable access link — no
        password to manage.
      </p>
      <MemberPortalPanel
        invitations={invitations}
        members={members}
        baseUrl={base}
      />
    </div>
  );
}
