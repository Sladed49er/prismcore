import type { Metadata } from "next";
import { SeoAuditPanel } from "@/components/seo-audit-panel";
import { publicAudit } from "./actions";

export const metadata: Metadata = {
  title: "PrismSEO — Free Website SEO Check",
  description:
    "Run a free on-page SEO audit of any page: title, meta, headings, alt text, social tags, and AI-prioritized suggestions. By PrismAMS.",
};

/**
 * PrismSEO — the public, no-login audit tool. A lead magnet for the full
 * SEO Engine module: five free audits an hour, real suggestions, and a
 * pointer to Prism for everything the one-off check can't do.
 */
export default function PrismSeoPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <header className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            PrismSEO
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Free website SEO check
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            Paste any page URL. We grade the on-page fundamentals — title,
            meta description, headings, alt text, social tags — and AI turns
            the findings into a prioritized fix list.
          </p>
        </header>

        <div className="mt-10">
          <SeoAuditPanel
            action={publicAudit}
            heading="Audit a page"
            subheading="Five free audits per hour. No sign-up."
          />
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
            href="https://prismams.com"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            See the SEO Engine
          </a>
        </footer>
      </div>
    </main>
  );
}
