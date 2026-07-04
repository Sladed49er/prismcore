import type { Metadata } from "next";
import { SeoAuditPanel } from "@/components/seo-audit-panel";
import { SeoSiteAuditPanel } from "@/components/seo-site-audit-panel";
import { SeoComparePanel } from "@/components/seo-compare-panel";
import {
  SeoMonitorPanel,
  type MonitorDTO,
} from "@/components/seo-monitor-panel";
import { AiVisibilityCheckPanel } from "@/components/ai-visibility-check-panel";
import {
  publicAudit,
  deepAudit,
  draftFill,
  deleteSavedAudit,
  compareSites,
  loadSavedAudit,
  addSiteMonitor,
  removeSiteMonitor,
  checkAiVisibility,
} from "./actions";
import { getPrismOptimizeMembership } from "@/lib/prismoptimize-membership";
import { listMonitors } from "@/lib/seo-monitoring";
import { listSiteAudits } from "@/lib/seo-audit-store";

/** The deep site crawl runs minutes — give the server action headroom. */
export const maxDuration = 800;

export const metadata: Metadata = {
  title: "PrismOptimize — Website SEO Audits",
  description:
    "Members-only on-page SEO audits: title, meta, headings, alt text, social tags, and AI-prioritized suggestions. By PrismAMS.",
};

/**
 * PrismOptimize — the members-only audit tool, served at the root of
 * prismoptimize.com (rewritten in next.config) and at /prismseo on the app
 * domain.
 *
 * The Clerk session lives on the app domain (core.prismams.com), so sign-in
 * links are absolute and the signed-in experience runs there; the
 * prismoptimize.com root doubles as the marketing landing. Membership is the
 * `PRISMOPTIMIZE_MEMBER_EMAILS` gift list until paid plans launch.
 */

const APP_ORIGIN = "https://core.prismams.com";
const TOOL_URL = `${APP_ORIGIN}/prismseo`;
const SIGN_IN_URL = `${APP_ORIGIN}/sign-in?redirect_url=${encodeURIComponent(TOOL_URL)}`;
const SIGN_UP_URL = `${APP_ORIGIN}/sign-up?redirect_url=${encodeURIComponent(TOOL_URL)}`;

export default async function PrismSeoPage() {
  const membership = await getPrismOptimizeMembership();
  const [monitors, savedAudits] = membership.entitled
    ? await Promise.all([
        listMonitors(membership.userId).then((rows) =>
          rows.map(
            (m): MonitorDTO => ({
              id: m.id,
              siteUrl: m.siteUrl,
              lastScore: m.lastScore,
              lastRunAt: m.lastRunAt?.toISOString() ?? null,
            }),
          ),
        ),
        listSiteAudits(membership.userId),
      ])
    : [[], []];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <header className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            PrismOptimize
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Website SEO audits, graded and prioritized
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            Paste any page URL. We grade the on-page fundamentals — title,
            meta description, headings, alt text, social tags — and AI turns
            the findings into a prioritized fix list.
          </p>
        </header>

        <div className="mt-10">
          {membership.entitled ? (
            <div className="space-y-6">
              <SeoSiteAuditPanel
                action={deepAudit}
                draftFill={draftFill}
                remove={deleteSavedAudit}
                saved={savedAudits}
                load={loadSavedAudit}
              />
              <SeoComparePanel action={compareSites} />
              <AiVisibilityCheckPanel action={checkAiVisibility} />
              <SeoMonitorPanel
                monitors={monitors}
                add={addSiteMonitor}
                remove={removeSiteMonitor}
              />
              <SeoAuditPanel
                action={publicAudit}
                heading="Quick single-page check"
                subheading={`Signed in as ${membership.email} — unlimited audits.`}
              />
            </div>
          ) : membership.signedIn ? (
            <section className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Memberships are opening soon
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                You&apos;re signed in as {membership.email}, but this account
                doesn&apos;t have an active PrismOptimize membership yet.
                Want early access? Reach out and we&apos;ll set you up.
              </p>
              <a
                href="mailto:matt@prismams.com?subject=PrismOptimize%20membership"
                className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Request access
              </a>
            </section>
          ) : (
            <section className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Members-only
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                PrismOptimize is in early access. Sign in to run audits — or
                create an account and we&apos;ll notify you when memberships
                open.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <a
                  href={SIGN_IN_URL}
                  className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Member sign in
                </a>
                <a
                  href={SIGN_UP_URL}
                  className="inline-block rounded-lg border border-indigo-200 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  Create account
                </a>
              </div>
            </section>
          )}
        </div>

        <footer className="mt-12 rounded-xl border border-indigo-100 bg-indigo-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-indigo-900">
            Want this running on autopilot?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-indigo-900/80">
            The Prism SEO Engine tracks your keywords, drafts articles with
            AI, and publishes to your site with one click of approval — built
            into PrismAMS.
          </p>
          <a
            href="mailto:matt@prismams.com?subject=Prism%20SEO%20Engine%20demo"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Request a demo
          </a>
        </footer>
      </div>
    </main>
  );
}
