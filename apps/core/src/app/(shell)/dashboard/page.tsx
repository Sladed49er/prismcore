import Link from "next/link";
import { loadCurrentTenant } from "@/lib/kernel";
import { listClients } from "@/lib/clients";
import { listOpportunities } from "@/lib/pipeline";
import { listInvoices } from "@/lib/accounting";
import { listBills } from "@/lib/ap";
import { listPolicies } from "@/lib/policies";
import { listClaims } from "@/lib/claims";
import { listRenewals } from "@/lib/renewals";
import { listTickets } from "@/lib/tickets";
import { listClientActivities } from "@/lib/client-activities";
import { ModuleIcon } from "@/components/module-icon";
import { DashboardGreeting } from "@/components/dashboard-greeting";

function money(cents: number): string {
  return "$" + Math.round(cents / 100).toLocaleString();
}

const ACTIVITY_LABEL: Record<string, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  task: "Task",
};

/** Tint pairs for the stat-card icon chips. */
const TINTS: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
  rose: "bg-rose-50 text-rose-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-100 text-slate-600",
};

export default async function DashboardPage() {
  const { config, modules } = await loadCurrentTenant();
  const has = (id: string): boolean => modules.some((m) => m.id === id);
  const tid = config.id;

  const [
    clients,
    opportunities,
    invoices,
    bills,
    policies,
    claims,
    renewals,
    tickets,
    activities,
  ] = await Promise.all([
    listClients(tid),
    listOpportunities(tid),
    listInvoices(tid),
    listBills(tid),
    listPolicies(tid),
    listClaims(tid),
    listRenewals(tid),
    listTickets(tid),
    listClientActivities(tid),
  ]);

  const activeClients = clients.filter((c) => c.status === "active").length;
  const openOpps = opportunities.filter(
    (o) => o.stage !== "won" && o.stage !== "lost",
  );
  const pipelineValue = openOpps.reduce((s, o) => s + o.valueCents, 0);
  const arOutstanding = invoices
    .filter((i) => i.status === "sent")
    .reduce((s, i) => s + i.amountCents, 0);
  const apPayable = bills
    .filter((b) => b.status !== "void" && b.status !== "paid")
    .reduce((s, b) => s + b.balanceCents, 0);
  const activePolicies = policies.filter((p) => p.status === "active").length;
  const openClaims = claims.filter(
    (c) => c.status === "open" || c.status === "investigating",
  ).length;
  const openRenewals = renewals.filter(
    (r) => r.stage !== "renewed" && r.stage !== "lost",
  ).length;
  const openTickets = tickets.filter(
    (t) => t.status === "open" || t.status === "in_progress",
  ).length;

  interface Stat {
    label: string;
    value: string;
    sub: string;
    href: string;
    icon: string;
    tint: string;
  }
  const stats: Stat[] = [
    {
      label: "Clients",
      value: String(clients.length),
      sub: `${activeClients} active`,
      href: "/m/clients/register",
      icon: "users",
      tint: "indigo",
    },
  ];
  if (has("pipeline")) {
    stats.push({
      label: "Open pipeline",
      value: String(openOpps.length),
      sub: `${money(pipelineValue)} in play`,
      href: "/m/pipeline/opportunities",
      icon: "trending-up",
      tint: "violet",
    });
  }
  if (has("accounting")) {
    stats.push(
      {
        label: "A/R outstanding",
        value: money(arOutstanding),
        sub: `${invoices.filter((i) => i.status === "sent").length} sent invoices`,
        href: "/m/accounting/invoices",
        icon: "dollar-sign",
        tint: "emerald",
      },
      {
        label: "A/P payable",
        value: money(apPayable),
        sub: `${bills.filter((b) => b.status !== "void" && b.status !== "paid").length} open bills`,
        href: "/m/accounting/bills",
        icon: "file-text",
        tint: "amber",
      },
    );
  }
  if (has("policies")) {
    stats.push({
      label: "Active policies",
      value: String(activePolicies),
      sub: `${policies.length} on the book`,
      href: "/m/policies/register",
      icon: "shield",
      tint: "sky",
    });
  }
  if (has("claims")) {
    stats.push({
      label: "Open claims",
      value: String(openClaims),
      sub: `${claims.length} total`,
      href: "/m/claims/register",
      icon: "alert-triangle",
      tint: "rose",
    });
  }
  if (has("renewals")) {
    stats.push({
      label: "Open renewals",
      value: String(openRenewals),
      sub: "in the pipeline",
      href: "/m/renewals/pipeline",
      icon: "clock",
      tint: "amber",
    });
  }
  stats.push({
    label: "Open requests",
    value: String(openTickets),
    sub: "support tickets",
    href: "/support/requests",
    icon: "life-buoy",
    tint: "slate",
  });

  const recentActivity = activities.slice(0, 6);
  const sentInvoices = invoices
    .filter((i) => i.status === "sent")
    .slice(0, 5);
  const openBills = bills
    .filter((b) => b.status !== "void" && b.status !== "paid")
    .slice(0, 5);

  // Quick-navigate shortcuts — one per enabled module.
  const quickNav = modules
    .map((m) => ({
      id: m.id,
      name: m.name,
      icon: m.icon,
      href: m.nav?.[0]?.href ?? `/m/${m.id}`,
    }))
    .slice(0, 12);

  // Action buttons, gated by enabled modules.
  const actions: { label: string; href: string; icon: string }[] = [
    { label: "New client", href: "/m/clients/register", icon: "user-plus" },
  ];
  if (has("policies")) {
    actions.push({
      label: "New policy",
      href: "/m/policies/register",
      icon: "file-text",
    });
  }
  if (has("esign")) {
    actions.push({ label: "Send eSign", href: "/m/esign", icon: "pen" });
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      {/* Header — greeting + actions */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <DashboardGreeting workspaceName={config.name} />
        <div className="flex flex-wrap gap-2">
          {actions.map((a, i) => (
            <Link
              key={a.href}
              href={a.href}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                i === 0
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ModuleIcon name={a.icon} className="h-4 w-4" />
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${TINTS[s.tint] ?? TINTS.slate}`}
            >
              <ModuleIcon name={s.icon} className="h-4 w-4" />
            </span>
            <p className="mt-3 text-2xl font-semibold text-gray-900">
              {s.value}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {s.label}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* Activity + open items */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Recent activity
            </h2>
            <Link
              href="/m/clients/activities"
              className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
            >
              View all
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">
              No client activity logged yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {recentActivity.map((a) => (
                <li key={a.id} className="py-2.5">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold">
                      {ACTIVITY_LABEL[a.activityType] ?? a.activityType}
                    </span>
                    <span className="font-medium text-gray-700">
                      {a.clientName}
                    </span>
                    <span>{a.activityDate ?? "—"}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-800">{a.subject}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700">Open items</h2>
          {!has("accounting") ? (
            <p className="mt-4 text-sm text-gray-400">
              Enable Accounting to track receivables and payables here.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span>Receivables — sent</span>
                  <span>{money(arOutstanding)}</span>
                </div>
                {sentInvoices.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-400">
                    Nothing outstanding.
                  </p>
                ) : (
                  <ul className="mt-1 divide-y divide-gray-100">
                    {sentInvoices.map((i) => (
                      <li
                        key={i.id}
                        className="flex items-center justify-between py-1.5 text-sm"
                      >
                        <span className="text-gray-700">
                          {i.invoiceNumber} · {i.clientName}
                        </span>
                        <span className="font-medium text-gray-900">
                          {money(i.amountCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span>Payables — open bills</span>
                  <span>{money(apPayable)}</span>
                </div>
                {openBills.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-400">
                    Nothing payable.
                  </p>
                ) : (
                  <ul className="mt-1 divide-y divide-gray-100">
                    {openBills.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between py-1.5 text-sm"
                      >
                        <span className="text-gray-700">
                          {b.billNumber} · {b.vendorName}
                        </span>
                        <span className="font-medium text-gray-900">
                          {money(b.balanceCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Quick navigate */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Quick navigate</h2>
        <Link
          href="/compose"
          className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700"
        >
          Recompose workspace
        </Link>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {quickNav.map((m) => (
          <Link
            key={m.id}
            href={m.href}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-indigo-300 hover:shadow-sm"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <ModuleIcon name={m.icon} className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-gray-800">
              {m.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
